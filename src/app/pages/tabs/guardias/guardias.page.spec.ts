import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuardiasPage } from './guardias.page';

describe('GuardiasPage', () => {
  let component: GuardiasPage;
  let fixture: ComponentFixture<GuardiasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GuardiasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
