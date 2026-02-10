# Cloudinary Setup Guide

## Step 1: Create Cloudinary Account

1. Go to https://cloudinary.com/
2. Click "Sign Up for Free"
3. Create account (free tier includes 25GB storage)

## Step 2: Get API Credentials

1. Login to Cloudinary Dashboard
2. Go to Dashboard → Settings → Access Keys
3. Copy these values:
   - Cloud Name
   - API Key
   - API Secret

## Step 3: Update Backend .env

Add these to your `backend/.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## Step 4: Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `cloudinary` - Cloudinary SDK
- `multer` - File upload middleware
- `multer-storage-cloudinary` - Cloudinary storage for Multer

## Step 5: Test Upload

1. Start backend server:
```bash
npm start
```

2. Test upload endpoint:
```bash
curl -X POST http://localhost:5000/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

## Features Implemented

### Single Image Upload
- Endpoint: `POST /api/upload`
- Max size: 5MB
- Formats: JPG, JPEG, PNG, GIF, WEBP
- Auto-resize: 1000x1000 (maintains aspect ratio)

### Multiple Images Upload
- Endpoint: `POST /api/upload/multiple`
- Max files: 5
- Same size and format restrictions

### Frontend Integration
- Drag & drop upload
- Image preview
- Progress indicator
- Fallback to URL input
- Automatic upload on file select

## Folder Structure

Images are stored in Cloudinary with this structure:
```
findit-items/
  ├── image1.jpg
  ├── image2.png
  └── ...
```

## Image Transformations

Cloudinary automatically:
- Resizes large images to 1000x1000
- Optimizes file size
- Converts to WebP (if supported)
- Provides CDN delivery

## Security

- Upload requires authentication (JWT token)
- File type validation
- Size limits enforced
- Secure API credentials

## Troubleshooting

### "Invalid credentials"
- Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env
- Make sure no extra spaces in credentials

### "File too large"
- Max size is 5MB
- Compress image before uploading

### "Unsupported format"
- Only JPG, JPEG, PNG, GIF, WEBP allowed
- Convert image to supported format

## Free Tier Limits

Cloudinary Free Plan includes:
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month
- More than enough for development!

## Production Tips

1. **Enable Auto-backup**
   - Settings → Security → Backup

2. **Set Upload Presets**
   - Settings → Upload → Upload presets

3. **Enable Moderation**
   - Settings → Security → Moderation

4. **Monitor Usage**
   - Dashboard → Usage

## Alternative: Local Storage

If you don't want to use Cloudinary, you can store images locally:

1. Create `backend/uploads` folder
2. Update multer config to use disk storage
3. Serve static files with Express

See `backend/config/cloudinary.js` for implementation.
