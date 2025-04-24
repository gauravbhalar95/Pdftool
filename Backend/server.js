const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, '../public')));

// Merge PDFs
app.post('/merge', async (req, res) => {
  try {
    const files = req.files?.pdfs;
    if (!files) return res.status(400).send('No files uploaded.');

    const mergedPdf = await PDFDocument.create();
    const filesArray = Array.isArray(files) ? files : [files];

    for (let file of filesArray) {
      const pdfBytes = file.data;
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    res.setHeader('Content-Disposition', 'attachment; filename=merged.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(mergedBytes));
  } catch (error) {
    res.status(500).send(`Error merging PDFs: ${error.message}`);
  }
});

// Split PDF
app.post('/split', async (req, res) => {
  try {
    const file = req.files?.pdf;
    if (!file) return res.status(400).send('No file uploaded.');

    const pdfDoc = await PDFDocument.load(file.data);
    const pageCount = pdfDoc.getPageCount();
    
    let splitPdfs = [];
    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);
      const pdfBytes = await newPdf.save();
      splitPdfs.push(pdfBytes);
    }

    res.json({
      message: 'PDF split successfully',
      pdfs: splitPdfs.map(pdf => Buffer.from(pdf).toString('base64'))
    });
  } catch (error) {
    res.status(500).send(`Error splitting PDF: ${error.message}`);
  }
});

// Compress PDF
app.post('/compress', async (req, res) => {
  try {
    const file = req.files?.pdf;
    if (!file) return res.status(400).send('No file uploaded.');

    const pdfDoc = await PDFDocument.load(file.data, { 
      updateMetadata: false 
    });
    
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      compress: true
    });

    res.setHeader('Content-Disposition', 'attachment; filename=compressed.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(compressedBytes));
  } catch (error) {
    res.status(500).send(`Error compressing PDF: ${error.message}`);
  }
});

// Add Watermark
app.post('/watermark', async (req, res) => {
  try {
    const file = req.files?.pdf;
    const watermarkText = req.body.text || 'WATERMARK';
    if (!file) return res.status(400).send('No file uploaded.');

    const pdfDoc = await PDFDocument.load(file.data);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    pages.forEach(page => {
      const { width, height } = page.getSize();
      page.drawText(watermarkText, {
        x: width / 2 - 150,
        y: height / 2,
        size: 60,
        font,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.3,
        rotate: Math.PI / 4,
      });
    });

    const watermarkedBytes = await pdfDoc.save();
    res.setHeader('Content-Disposition', 'attachment; filename=watermarked.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(watermarkedBytes));
  } catch (error) {
    res.status(500).send(`Error adding watermark: ${error.message}`);
  }
});

// Rotate PDF pages
app.post('/rotate', async (req, res) => {
  try {
    const file = req.files?.pdf;
    const degrees = parseInt(req.body.degrees) || 90;
    if (!file) return res.status(400).send('No file uploaded.');

    const pdfDoc = await PDFDocument.load(file.data);
    const pages = pdfDoc.getPages();

    pages.forEach(page => {
      page.setRotation(degrees);
    });

    const rotatedBytes = await pdfDoc.save();
    res.setHeader('Content-Disposition', 'attachment; filename=rotated.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(rotatedBytes));
  } catch (error) {
    res.status(500).send(`Error rotating PDF: ${error.message}`);
  }
});

// Extract text from PDF
app.post('/extract-text', async (req, res) => {
  try {
    const file = req.files?.pdf;
    if (!file) return res.status(400).send('No file uploaded.');

    // Note: pdf-lib doesn't support text extraction
    // You would need to use a different library like pdf-parse or pdfjs-dist
    res.status(501).send('Text extraction not implemented. Consider using pdf-parse library.');
  } catch (error) {
    res.status(500).send(`Error extracting text: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});