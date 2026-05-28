import { Page, Locator } from 'playwright';

export class HumanBehavior {
  /**
   * Random delay between min and max milliseconds.
   */
  static async sleep(min: number, max: number = min): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Moves mouse smoothly from current position to target coordinates.
   */
  static async moveMouseSmoothly(page: Page, x: number, y: number, steps: number = 10): Promise<void> {
    await page.mouse.move(x, y, { steps });
  }

  /**
   * Clicks an element like a human: moves mouse, slight delay, click.
   */
  static async naturalClick(page: Page, locator: Locator | string): Promise<void> {
    const loc = typeof locator === 'string' ? page.locator(locator).first() : locator;
    
    // Ensure it's in view
    await loc.scrollIntoViewIfNeeded();
    
    const box = await loc.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2 + (Math.random() * 4 - 2);
      const targetY = box.y + box.height / 2 + (Math.random() * 4 - 2);
      
      await this.moveMouseSmoothly(page, targetX, targetY, 5 + Math.floor(Math.random() * 10));
      await this.sleep(100, 300);
      await page.mouse.down();
      await this.sleep(50, 150);
      await page.mouse.up();
    } else {
      // Fallback to standard click if bounding box is missing
      await loc.click();
    }
  }

  /**
   * Simulates a user "reading" or "scanning" the page by scrolling randomly.
   */
  static async naturalScroll(page: Page): Promise<void> {
    const distance = Math.floor(Math.random() * 500) + 200;
    const direction = Math.random() > 0.2 ? 1 : -1; // 80% chance to scroll down
    await page.evaluate(({ dist, dir }) => {
      window.scrollBy({ top: dist * dir, behavior: 'smooth' });
    }, { dist: distance, dir: direction });
    await this.sleep(1000, 2500);
  }

  /**
   * Types text with variable delay between keystrokes.
   */
  static async typeLikeHuman(page: Page, locator: Locator | string, text: string): Promise<void> {
    const loc = typeof locator === 'string' ? page.locator(locator).first() : locator;
    await loc.focus();
    for (const char of text) {
      await page.keyboard.type(char);
      await this.sleep(30, 150); // Jittered delay per char
      if (Math.random() > 0.95) await this.sleep(500, 1000); // Occasional "thought" pause
    }
  }
}
