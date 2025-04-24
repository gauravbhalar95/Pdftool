// backend/server.js
import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(fileUpload());
app.use(express.static(join(__dirname, '../public')));

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

// Get PDF Info
app.post('/info', async (req, res) => {
  try {
    const file = req.files?.pdf;
    if (!file) return res.status(400).send('No file uploaded.');

    const pdfDoc = await PDFDocument.load(file.data);
    const pageCount = pdfDoc.getPageCount();
    const firstPage = pdfDoc.getPages()[0];
    const { width, height } = firstPage.getSize();

    res.json({
      pageCount,
      pageSize: {
        width: Math.round(width),
        height: Math.round(height)
      },
      title: pdfDoc.getTitle() || 'Untitled',
      author: pdfDoc.getAuthor() || 'Unknown',
      subject: pdfDoc.getSubject() || '',
      keywords: pdfDoc.getKeywords() || '',
      creator: pdfDoc.getCreator() || '',
      producer: pdfDoc.getProducer() || '',
      creationDate: pdfDoc.getCreationDate(),
      modificationDate: pdfDoc.getModificationDate()
    });
  } catch (error) {
    res.status(500).send(`Error getting PDF info: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});