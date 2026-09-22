import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; this.setAttribute('open', ''); };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() { this.open = false; this.removeAttribute('open'); this.dispatchEvent(new Event('close')); };
}
Object.defineProperty(window, 'confirm', { value: vi.fn(() => true), writable: true });
