#!/usr/bin/env node
/**
 * Validates the white-label configuration before building.
 * Run with: node scripts/verify-white-label.js
 * Or via: npm run verify:whitelabel
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// [AI]
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'brand.config.json'), 'utf8'));
// [/AI]

const errors = [];
const warnings = [];

// Required string fields
const requiredStrings = [
    ['brand_name', config.brand_name],
    ['brand_domain', config.brand_domain],
    ['brand_logo', config.brand_logo],
    ['brand_hostname.production', config.brand_hostname?.production],
    ['platform.name', config.platform?.name],
    ['auth.production', config.auth?.production],
    ['api_core.production', config.api_core?.production],
    ['api.production', config.api?.production],
];

for (const [field, value] of requiredStrings) {
    if (!value || typeof value !== 'string' || value.trim() === '') {
        errors.push(`Missing or empty required field: ${field}`);
    }
}

// Logo paths must be .svg
const logoPaths = [
    ['brand_logo', config.brand_logo],
    ['platform.logo', config.platform?.logo],
];
for (const [field, value] of logoPaths) {
    if (value && !value.endsWith('.svg') && !value.endsWith('.png')) {
        errors.push(`${field} must be an SVG or PNG file path ending in .svg or .png (got: "${value}")`);
    }
}

// brand_logo_dark is optional but must be .svg or .png if provided
if (config.brand_logo_dark && !config.brand_logo_dark.endsWith('.svg') && !config.brand_logo_dark.endsWith('.png')) {
    errors.push(`brand_logo_dark must be an SVG or PNG file path ending in .svg or .png (got: "${config.brand_logo_dark}")`);
}

// app_id must be numeric
if (config.app_id) {
    if (typeof config.app_id.staging !== 'number' && typeof config.app_id.staging !== 'string') {
        errors.push(`app_id.staging must be a number or string (got: ${typeof config.app_id.staging})`);
    }
    if (typeof config.app_id.production !== 'number' && typeof config.app_id.production !== 'string') {
        errors.push(`app_id.production must be a number or string (got: ${typeof config.app_id.production})`);
    }
    if (config.app_id.staging === 16929 && config.app_id.production === 16929) {
        warnings.push(
            'app_id is still using the default Deriv app_id (16929). Register your own at https://api.deriv.com'
        );
    }
} else {
    warnings.push('app_id is not configured. WebSocket will use the default. See WHITE_LABEL.md for setup.');
}

// Logo SVG files must exist in assets/brand/
const logoFiles = [config.brand_logo, config.brand_logo_dark, config.platform?.logo].filter(Boolean);
for (const logoPath of logoFiles) {
    const filename = path.basename(logoPath);
    const assetPath = path.join(ROOT, 'assets', 'brand', filename);
    if (!fs.existsSync(assetPath)) {
        errors.push(`Logo file not found: assets/brand/${filename} (referenced as "${logoPath}")`);
    }
}

// colors must be valid hex values
const colorFields = config.colors ?? {};
const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
for (const [colorName, value] of Object.entries(colorFields)) {
    if (typeof value !== 'string' || !hexPattern.test(value)) {
        errors.push(`colors.${colorName} must be a valid hex color (got: "${value}")`);
    }
}

// manifest.json — warn if default Deriv values are still present
const manifestPath = path.join(ROOT, 'packages', 'core', 'src', 'templates', 'app', 'manifest.json');
if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.description && manifest.description.includes('Deriv gives everyone')) {
        warnings.push(
            'manifest.json still has the default Deriv description — update platform.description in brand.config.json'
        );
    }
    if (typeof manifest.gcm_sender_id === 'number') {
        warnings.push(
            'manifest.json still has the default gcm_sender_id. Update or remove it if you are not using Deriv push notifications'
        );
    }
}

// PWA icons — warn if default Deriv-named files are still present
const pwaIconDir = path.join(ROOT, 'packages', 'core', 'src', 'public', 'images', 'common', 'logos', 'platform_logos');
if (fs.existsSync(pwaIconDir)) {
    const derivIcons = fs.readdirSync(pwaIconDir).filter(f => f.startsWith('ic_platform_deriv_'));
    if (derivIcons.length > 0) {
        warnings.push(
            `PWA icons still use the default Deriv filenames (${derivIcons.join(', ')}). ` +
                'Replace them with your own brand icons. See WHITE_LABEL.md → "PWA Icons"'
        );
    }
}

// package.json metadata — warn if still set to Deriv defaults
const corePkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', 'core', 'package.json'), 'utf8'));
if (corePkg.author === 'Deriv') {
    warnings.push('packages/core/package.json → author is still "Deriv". Update it to your organisation name');
}
if (corePkg.description === 'Deriv Core') {
    warnings.push('packages/core/package.json → description is still "Deriv Core". Update it to your platform name');
}
if (corePkg.repository?.url?.includes('deriv-com/derivatives-trader')) {
    warnings.push(
        'packages/core/package.json → repository.url still points to the upstream Deriv repo. Update it to your fork URL'
    );
}

// Report
if (warnings.length > 0) {
    console.warn('\n⚠️  Warnings:');
    warnings.forEach(w => console.warn(`   - ${w}`));
}

if (errors.length > 0) {
    console.error('\n❌ White-label config validation failed:\n');
    errors.forEach(e => console.error(`   - ${e}`));
    console.error('\nFix the above issues in brand.config.json before building.\n');
    process.exit(1);
}

console.log('\n✅ White-label config is valid.');
console.log(`   Brand: ${config.brand_name}`);
console.log(`   Platform: ${config.platform?.name}`);
console.log(`   Production URL: https://${config.brand_hostname?.production}`);
console.log(`   App ID (staging): ${config.app_id?.staging ?? 'not set'}`);
console.log(`   App ID (production): ${config.app_id?.production ?? 'not set'}\n`);
