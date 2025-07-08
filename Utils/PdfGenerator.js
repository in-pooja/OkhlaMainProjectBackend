
import PDFDocument from 'pdfkit'
import getStream from 'get-stream'

const generateReceiptPDF = async (member, receipt) => {
  const doc = new PDFDocument();
  doc.fontSize(18).text("Payment Receipt", { align: "center" });

  doc.moveDown();
  doc.fontSize(12).text(`Member Name: ${member.MemberName}`);
  doc.text(`Company Name: ${member.CompanyName}`);
  doc.text(`Email: ${member.Email}`);
  doc.text(`Receipt No: ${receipt.ReceiptNumber}`);
  doc.text(`Amount Paid: ₹${receipt.ReceivedAmount}`);
  doc.text(`Payment Date: ${receipt.ReceiptDate}`);

  doc.end();
  const buffer = await getStream.buffer(doc);
  return buffer;
};

export default generateReceiptPDF;