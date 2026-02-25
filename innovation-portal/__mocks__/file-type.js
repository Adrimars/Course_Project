// Manual Jest mock for file-type (ESM-only is not compatible with Jest CMS mode)
module.exports = {
  fileTypeFromBuffer: async (buffer) => {
    // Mock implementation: detect MIME type from magic bytes (first few bytes)
    // PDF: %PDF (0x25 0x50 0x44 0x46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44) {
      return { mime: 'application/pdf', ext: 'pdf' };
    }
    // PNG: 0x89 0x50 0x4E 0x47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) {
      return { mime: 'image/png', ext: 'png' };
    }
    // JPEG: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mime: 'image/jpeg', ext: 'jpg' };
    }
    // DOCX: PK (zip file magic bytes), looks like Office Open XML
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' };
    }
    // DOC: Unknown - could be OLE compound file (0xD0 0xCF 0x11 0xE0)
    if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11) {
      return { mime: 'application/msword', ext: 'doc' };
    }
    return null;
  },
};
