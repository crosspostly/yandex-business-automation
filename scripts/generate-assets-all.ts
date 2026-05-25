import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

async function generateAllAssets() {
  console.log('🎨 Generating all marketing assets for the Ultimate Test...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const generateImage = async (text: string, subtext: string, width: number, height: number, outPath: string, gradient: string, isLogo = false) => {
      await page.setViewportSize({ width, height });
      const html = `
      <html>
      <body style="margin:0;padding:0; overflow:hidden;">
          <div style="width:${width}px;height:${height}px;background:${gradient};color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:sans-serif;text-align:center;">
              ${isLogo ? `<div style="font-size:${width/4}px; font-weight:900; background:white; color:black; padding:20px; border-radius:20%;">K</div>` : ''}
              <h1 style="font-size: ${width/10}px; margin: 20px 0; font-weight: 800; text-transform: uppercase;">${text}</h1>
              <p style="font-size: ${width/20}px; padding: 0 40px;">${subtext}</p>
          </div>
      </body>
      </html>`;
      await page.setContent(html);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: outPath });
      console.log(`✓ Generated ${outPath}`);
  };

  await generateImage('КЛУБИКА', 'Marketing Agency', 512, 512, 'data/logo.png', 'linear-gradient(45deg, #000 0%, #333 100%)', true);
  await generateImage('ИНТЕРЬЕР', 'Наш уютный офис', 1080, 1080, 'data/interior.jpg', 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)');
  await generateImage('ЭКСТЕРЬЕР', 'Нижний Новгород', 1080, 1080, 'data/exterior.jpg', 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)');
  await generateImage('АКЦИЯ', 'Скидка -50% на первый месяц', 900, 480, 'data/promo.jpg', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)');
  await generateImage('СТОРИЗ', 'Жми кнопку!', 1080, 1920, 'data/story.jpg', 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)');

  await browser.close();
}

generateAllAssets();
