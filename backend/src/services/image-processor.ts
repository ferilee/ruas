const WEBP_QUALITY = 80;

export interface ProcessedQuestionImage {
  body: Uint8Array;
  contentType: 'image/webp';
  fileSize: number;
}

export async function convertQuestionImageToWebp(input: Uint8Array): Promise<ProcessedQuestionImage> {
  const { default: sharp } = await import('sharp');
  const body = await sharp(input)
    .rotate()
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    body,
    contentType: 'image/webp',
    fileSize: body.byteLength,
  };
}
