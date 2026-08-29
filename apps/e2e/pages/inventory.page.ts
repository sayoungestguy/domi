import { expect, type Page } from '@playwright/test';

export class InventoryPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.getByRole('tab', { name: 'Inventory' }).click();
    await expect(this.page.getByLabel('Search items')).toBeVisible();
  }

  async addItem(name: string, quantity?: string, category?: string): Promise<void> {
    await this.page.getByRole('button', { name: /Add (your first )?item/ }).first().click();
    await this.page.getByLabel('Item name').fill(name);
    if (quantity) await this.page.getByLabel('Quantity (optional)').fill(quantity);
    if (category) {
      await this.page.getByLabel('New category').fill(category);
      await this.page.getByRole('button', { name: 'Create category' }).click();
      await expect(this.page.getByText(`${category} category created.`)).toBeVisible();
    }
    await this.page.getByRole('button', { name: 'Add item', exact: true }).last().click();
    await expect(this.page.getByText(`${name} was added.`)).toBeVisible();
  }

  async openEdit(name: string): Promise<void> {
    const card = this.page.getByTestId('inventory-item').filter({ hasText: name });
    await card.getByRole('button', { name: 'Edit' }).click();
    await expect(this.page.getByText(`Edit ${name}`)).toBeVisible();
  }

  async setStatus(name: string, status: 'OK' | 'LOW' | 'OUT'): Promise<void> {
    const card = this.page.getByTestId('inventory-item').filter({ hasText: name });
    await card.getByRole('button', { name: status }).click();
    await expect(this.page.getByText(new RegExp(`${name} is now ${status}|${name} is OUT`))).toBeVisible();
  }

  async archiveAndRestore(name: string): Promise<void> {
    const card = this.page.getByTestId('inventory-item').filter({ hasText: name });
    this.page.once('dialog', (dialog) => dialog.accept());
    await card.getByRole('button', { name: 'Archive' }).click();
    await expect(this.page.getByText(`${name} was archived.`)).toBeVisible();
    await this.page.getByRole('button', { name: 'Show archived' }).click();
    const archived = this.page.getByTestId('inventory-item').filter({ hasText: name });
    await expect(archived).toBeVisible();
    await archived.getByRole('button', { name: 'Restore' }).click();
    await expect(this.page.getByText(`${name} was restored.`)).toBeVisible();
    await this.page.getByRole('button', { name: 'Show active' }).click();
  }
}
