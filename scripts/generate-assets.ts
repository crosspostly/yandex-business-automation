import { chromium } from 'playwright-extra';

async function generateAssets() {
  console.log('Generating high-quality marketing assets...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const generateImage = async (text: string, subtext: string, width: number, height: number, outPath: string, gradient: string) => {
      await page.setViewportSize({ width, height });
      const html = `
      <html>
      <body style="margin:0;padding:0;">
          <div style="width:${width}px;height:${height}px;background:${gradient};color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;font-family:system-ui,-apple-system,sans-serif;text-align:center;">
              <h1 style="font-size: ${width/10}px; margin: 0; padding: 0 40px; font-weight: 800; text-transform: uppercase; letter-spacing: -2px; text-shadow: 0 4px 10px rgba(0,0,0,0.3);">${text}</h1>
              <p style="font-size: ${width/20}px; margin-top: 30px; padding: 0 60px; font-weight: 400; opacity: 0.9; line-height: 1.4;">${subtext.replace(/\n/g, '<br>')}</p>
              <div style="position:absolute; bottom: 50px; font-size: 30px; opacity: 0.5; font-weight: bold;">KLUBIKA AGENCY</div>
          </div>
      </body>
      </html>`;
      await page.setContent(html);
      await page.waitForTimeout(500); // allow render
      await page.screenshot({ path: outPath });
      console.log(`✓ Generated ${outPath}`);
  };

  await generateImage('КЛУБИКА', 'Маркетинговое агентство полного цикла', 1080, 1080, 'data/main_photo.png', 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)');
  await generateImage('ТРЕНДЫ 2026', 'Выводим бизнес в ТОП Карт без бюджета', 1080, 1080, 'data/post_photo.png', 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)');
  await generateImage('БЕСПЛАТНЫЙ АУДИТ', 'Найдем точки роста вашего бизнеса\n\nПишите в сообщения', 1080, 1920, 'data/story_photo.png', 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)');

  await browser.close();
}

generateAssets();
