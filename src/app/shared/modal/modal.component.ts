import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');

  readonly close = output<void>();

  onBackdrop(): void {
    this.close.emit();
  }
}
