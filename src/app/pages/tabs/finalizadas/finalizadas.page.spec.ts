import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinalizadasPage } from './finalizadas.page';

describe('FinalizadasPage', () => {
  let component: FinalizadasPage;
  let fixture: ComponentFixture<FinalizadasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FinalizadasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
