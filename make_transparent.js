import { Jimp } from 'jimp';

async function makeTransparent() {
  const image = await Jimp.read('src/assets/logo.png');

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    // If the pixel is very dark/black, make it transparent
    if (r < 20 && g < 20 && b < 20) {
      this.bitmap.data[idx + 3] = 0; // Alpha 0
    }
  });

  await image.write('src/assets/logo.png');
  console.log('Successfully made background transparent.');
}

makeTransparent().catch(console.error);
