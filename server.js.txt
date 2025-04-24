// backend/server.js
const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, '../public')));

app.post('/merge', async (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
