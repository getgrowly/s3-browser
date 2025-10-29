# Growly S3 Browser - GitHub Pages

This directory contains the GitHub Pages website for Growly S3 Browser.

## 🌐 Live Site

Visit: [https://getgrowly.github.io/growly-s3-browser](https://getgrowly.github.io/growly-s3-browser)

## 📁 Structure

```
docs/
├── index.html          # Main landing page
├── _config.yml         # Jekyll configuration
├── screenshots/        # Screenshot images
└── README.md          # This file
```

## 🚀 Setup GitHub Pages

1. **Enable GitHub Pages**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Under "Source", select "Deploy from a branch"
   - Choose "main" branch and "/docs" folder
   - Click "Save"

2. **Custom Domain (Optional)**
   - Add a `CNAME` file in this directory with your domain
   - Configure DNS records at your domain provider
   - Add your custom domain in repository settings

3. **HTTPS**
   - GitHub Pages automatically provides HTTPS
   - Ensure "Enforce HTTPS" is checked in settings

## 🎨 Customization

### Update Content

Edit `index.html` to modify:
- Hero section text
- Features list
- Download links
- Screenshots
- Footer information

### Styling

The page uses inline CSS for simplicity. Main sections:
- Header with gradient background
- Feature cards with hover effects
- Download section for each platform
- Tech stack grid
- Responsive footer

### Configuration

Edit `_config.yml` to update:
- Site title and description
- Base URL
- Social links
- Analytics tracking (optional)

## 📸 Adding Screenshots

1. Place screenshot images in the `screenshots/` directory
2. Update the image references in `index.html`
3. Recommended image sizes:
   - Hero image: 1200x630px
   - Screenshots: 800x600px or larger
   - Logo: 512x512px

## 🔧 Local Development

To test locally with Jekyll:

```bash
# Install Jekyll (if not already installed)
gem install jekyll bundler

# Navigate to docs directory
cd docs

# Serve the site
jekyll serve

# Open in browser
# http://localhost:4000/growly-s3-browser/
```

Or simply open `index.html` directly in a browser for quick previews.

## 🚀 Deployment

GitHub Pages automatically deploys when you push to the main branch:

```bash
git add docs/
git commit -m "docs: update GitHub Pages site"
git push origin main
```

The site will be live in 1-2 minutes at:
`https://getgrowly.github.io/growly-s3-browser`

## 📊 Analytics (Optional)

To add Google Analytics:

1. Get your Google Analytics tracking ID
2. Add it to `_config.yml`:
   ```yaml
   google_analytics: UA-XXXXXXXXX-X
   ```
3. Commit and push the changes

## 🎯 SEO Optimization

The page includes:
- Meta tags for description and keywords
- Open Graph tags for social sharing
- Twitter Card tags
- Structured data for search engines
- Sitemap generation (via Jekyll plugin)

## 📱 Social Media Preview

When sharing on social media, the Open Graph tags will display:
- Title: Growly S3 Browser
- Description: A Modern, Multi-Platform Desktop Application
- Image: Your logo or hero image

To customize the preview image, update the `og:image` meta tag in `index.html`.

## 🔗 Useful Links

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Jekyll Documentation](https://jekyllrb.com/docs/)
- [Markdown Guide](https://www.markdownguide.org/)

## 💡 Tips

1. **Badge Updates**: Badges automatically pull data from GitHub
2. **Version Numbers**: Update in `index.html` when releasing new versions
3. **Mobile Testing**: Test on different devices for responsiveness
4. **Performance**: Keep images optimized (use tools like TinyPNG)
5. **Accessibility**: Ensure alt text for all images

## 🤝 Contributing

To contribute to the website:

1. Fork the repository
2. Make changes in the `docs/` directory
3. Test locally
4. Submit a pull request

## 📝 License

This website is part of the Growly S3 Browser project and follows the same MIT License.

