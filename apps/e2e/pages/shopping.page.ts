import { expect, type Page } from '@playwright/test';

export class ShoppingPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Shopping' }).click();
    await expect(this.page.getByText('Shopping mode')).toBeVisible();
  }

  async addItem(name: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Add item' }).first().click();
    await this.page.getByLabel('Item name').fill(name);
    await this.page.getByRole('button', { name: 'Add to shopping' }).click();
    await expect(this.page.getByText(`${name} was added to shopping.`)).toBeVisible();
  }

  async check(name: string): Promise<void> {
    const entry = this.page.getByTestId('shopping-entry').filter({ hasText: name });
    await entry.getByRole('checkbox').click();
    await expect(this.page.getByText('Purchased (1)')).toBeVisible();
  }

  async finish(): Promise<void> {
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.page.getByRole('button', { name: 'Finish shopping' }).click();
    await expect(this.page.getByText(/Shopping finished with \d+ item/)).toBeVisible();
    await expect(this.page.getByText('Recent trips')).toBeVisible();
  }
}
