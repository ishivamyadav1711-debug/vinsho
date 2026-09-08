import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isJsonMode = process.argv.includes('--json');

const sourceConfigPath = path.join(rootDir, 'public', 'images', 'vinsho', 'products', 'Corporate-gifting', 'IMAGE_MAPPING_SOURCE.json');
const csvPath = path.join(rootDir, 'public', 'images', 'vinsho', 'products', 'Corporate-gifting', 'IMAGE_MAPPING.csv');
const imgDir = path.join(rootDir, 'public', 'images', 'vinsho', 'products', 'Corporate-gifting');

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(s => s.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = [];
    let insideQuote = false;
    let currentToken = '';
    
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        row.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    row.push(currentToken.trim());

    if (row.length >= header.length) {
      const obj = {};
      header.forEach((h, idx) => {
        let val = row[idx] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        obj[h] = val;
      });
      records.push(obj);
    }
  }
  return records;
}

function runValidation() {
  const errors = [];
  const warnings = [];
  const missingProducts = [];
  const unmappedProducts = [];
  const unmappedImages = [];
  const needsReviewProducts = [];

  // 1. Validate Source Configuration File
  if (!fs.existsSync(sourceConfigPath)) {
    errors.push(`IMAGE_MAPPING_SOURCE.json not found at: ${sourceConfigPath}`);
    return finishValidation(false, 0, 0, 0, 0, 0, 0, 0, errors, warnings, missingProducts, unmappedProducts, unmappedImages, needsReviewProducts);
  }

  let sourceConfig;
  try {
    sourceConfig = JSON.parse(fs.readFileSync(sourceConfigPath, 'utf8'));
  } catch (err) {
    errors.push(`Failed to parse IMAGE_MAPPING_SOURCE.json: ${err.message}`);
    return finishValidation(false, 0, 0, 0, 0, 0, 0, 0, errors, warnings, missingProducts, unmappedProducts, unmappedImages, needsReviewProducts);
  }

  const relSourcePath = sourceConfig.productDataSource;
  if (!relSourcePath || path.isAbsolute(relSourcePath) || relSourcePath.includes(':\\')) {
    errors.push(`productDataSource in IMAGE_MAPPING_SOURCE.json must be a non-empty project-relative path. Got: "${relSourcePath}"`);
  }

  const absSourcePath = path.join(rootDir, relSourcePath);
  if (!fs.existsSync(absSourcePath)) {
    errors.push(`Recorded productDataSource file does not exist: ${absSourcePath}`);
    return finishValidation(false, 0, 0, 0, 0, 0, 0, 0, errors, warnings, missingProducts, unmappedProducts, unmappedImages, needsReviewProducts);
  }

  // 2. Load Product Data dynamically from recorded source
  let rawSourceData;
  try {
    rawSourceData = JSON.parse(fs.readFileSync(absSourcePath, 'utf8'));
  } catch (err) {
    errors.push(`Failed to parse source product data at ${absSourcePath}: ${err.message}`);
    return finishValidation(false, 0, 0, 0, 0, 0, 0, 0, errors, warnings, missingProducts, unmappedProducts, unmappedImages, needsReviewProducts);
  }

  const allProductsArray = Array.isArray(rawSourceData) 
    ? rawSourceData 
    : (rawSourceData[sourceConfig.productCollection || 'products'] || []);

  const targetCategory = (sourceConfig.categoryIdentifier || 'corporate-gifting').toLowerCase();

  const cgProducts = allProductsArray.filter(p => {
    const subKey = (p.subcategoryKey || p.subCategory || p.subcategory || '').toLowerCase();
    const colKey = (p.collectionKey || p.collection || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    return subKey === targetCategory || colKey === targetCategory || cat.includes('cork') || cat.includes('corporate');
  });

  const totalProductsCount = cgProducts.length;

  // 3. Load CSV Mapping
  if (!fs.existsSync(csvPath)) {
    errors.push(`IMAGE_MAPPING.csv not found at: ${csvPath}`);
    return finishValidation(false, totalProductsCount, 0, 0, 0, 0, 0, 0, errors, warnings, missingProducts, unmappedProducts, unmappedImages, needsReviewProducts);
  }

  const csvRows = parseCSV(fs.readFileSync(csvPath, 'utf8'));

  // 4. Scan Image Directory Files
  const dirFiles = fs.existsSync(imgDir) ? fs.readdirSync(imgDir) : [];
  const imageFilesInDir = new Set(
    dirFiles.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return allowedExtensions.has(ext);
    })
  );

  const mappedImageFiles = new Set();
  let mappedImagesCount = 0;
  let missingImagesCount = 0;
  let invalidMappingsCount = 0;
  let needsReviewCount = 0;

  const csvBySlug = new Map();
  const csvById = new Map();

  csvRows.forEach(row => {
    if (row.product_slug) csvBySlug.set(row.product_slug, row);
    if (row.product_id) csvById.set(row.product_id, row);
  });

  // 5. Validate Product Data vs CSV & Image Files
  cgProducts.forEach(prod => {
    const pSlug = prod.slug;
    const pId = prod.id ? String(prod.id) : '';
    const pName = prod.name;

    const csvRow = csvBySlug.get(pSlug) || (pId ? csvById.get(pId) : null);

    if (!csvRow) {
      unmappedProducts.push(pName);
      errors.push(`Unmapped Product: "${pName}" (slug: ${pSlug}) is present in source data but missing from IMAGE_MAPPING.csv`);
      return;
    }

    const imgFile = csvRow.image_file;
    const webPath = csvRow.image_web_path;
    const status = csvRow.status;
    const notes = csvRow.notes;

    if (status === 'needs_review') {
      needsReviewCount++;
      needsReviewProducts.push(pName);
    }

    // Path validation
    if (webPath) {
      if (webPath.includes(':\\') || webPath.startsWith('C:') || webPath.startsWith('file://')) {
        invalidMappingsCount++;
        errors.push(`Invalid Web Path for "${pName}": Path "${webPath}" is an absolute/Windows path or file:// URL.`);
      } else if (!webPath.startsWith('/images/vinsho/products/Corporate-gifting/')) {
        warnings.push(`Non-standard web path format for "${pName}": "${webPath}"`);
      }
    }

    if (imgFile) {
      const ext = path.extname(imgFile).toLowerCase();
      if (!allowedExtensions.has(ext)) {
        invalidMappingsCount++;
        errors.push(`Invalid Image Extension for "${pName}": File "${imgFile}" has unsupported extension.`);
      }

      const fileOnDisk = path.join(imgDir, imgFile);
      if (!fs.existsSync(fileOnDisk)) {
        invalidMappingsCount++;
        errors.push(`Missing Image File for "${pName}": File "${imgFile}" referenced in CSV does not exist on disk at ${fileOnDisk}`);
      } else {
        mappedImageFiles.add(imgFile);
        mappedImagesCount++;
      }
    } else {
      if (status === 'mapped') {
        invalidMappingsCount++;
        errors.push(`Inconsistent Status for "${pName}": Status is marked 'mapped' but no image_file is specified.`);
      } else {
        missingImagesCount++;
        missingProducts.push(pName);
      }
    }
  });

  // 6. Check for Obsolete CSV Mappings
  const sourceSlugs = new Set(cgProducts.map(p => p.slug));
  csvRows.forEach(row => {
    if (row.product_slug && !sourceSlugs.has(row.product_slug)) {
      errors.push(`Obsolete Mapping: Product slug "${row.product_slug}" in IMAGE_MAPPING.csv does not exist in current product data.`);
    }
  });

  // 7. Check for Unmapped Images in Directory
  imageFilesInDir.forEach(f => {
    if (!mappedImageFiles.has(f)) {
      unmappedImages.push(f);
      warnings.push(`Unmapped Image File in directory: "${f}" is present in public/images/vinsho/products/Corporate-gifting/ but not assigned in IMAGE_MAPPING.csv`);
    }
  });

  const isValid = errors.length === 0 && invalidMappingsCount === 0 && unmappedProducts.length === 0;

  return finishValidation(
    isValid,
    totalProductsCount,
    mappedImagesCount,
    missingImagesCount,
    unmappedProducts.length,
    unmappedImages.length,
    invalidMappingsCount,
    needsReviewCount,
    errors,
    warnings,
    missingProducts,
    unmappedProducts,
    unmappedImages,
    needsReviewProducts
  );
}

function finishValidation(
  isValid,
  totalProducts,
  mappedImages,
  missingImages,
  unmappedProductsCnt,
  unmappedImagesCnt,
  invalidMappings,
  needsReview,
  errors,
  warnings,
  missingProducts,
  unmappedProducts,
  unmappedImages,
  needsReviewProducts
) {
  const result = {
    valid: isValid,
    totalProducts,
    mappedImages,
    missingImages,
    unmappedProducts: unmappedProductsCnt,
    unmappedImages: unmappedImagesCnt,
    invalidMappings,
    needsReview,
    errors,
    warnings,
    missingProducts,
    unmappedProducts,
    unmappedImages,
    needsReviewProducts,
    validatedAt: new Date().toISOString()
  };

  if (isJsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n==========================================================');
    console.log('    VINSHO — CORPORATE GIFTING IMAGE VALIDATION REPORT    ');
    console.log('==========================================================\n');
    console.log(`Products:             ${totalProducts}`);
    console.log(`Mapped images:        ${mappedImages}`);
    console.log(`Missing images:        ${missingImages}`);
    console.log(`Unmapped products:     ${unmappedProductsCnt}`);
    console.log(`Unmapped images:       ${unmappedImagesCnt}`);
    console.log(`Invalid mappings:      ${invalidMappings}`);
    console.log(`Needs review:          ${needsReview}\n`);

    if (warnings.length > 0) {
      console.log('WARNINGS:');
      warnings.forEach(w => console.log(`  ⚠ ${w}`));
      console.log('');
    }

    if (errors.length > 0) {
      console.log('ERRORS:');
      errors.forEach(e => console.log(`  ✖ ${e}`));
      console.log('');
    }

    if (isValid) {
      console.log('✓ VALIDATION PASSED\n');
    } else {
      console.log('✗ VALIDATION FAILED\n');
    }
  }

  process.exit(isValid ? 0 : 1);
}

runValidation();
