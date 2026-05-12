import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsumosPage } from './insumos.page';

describe('InsumosPage', () => {
  let component: InsumosPage;
  let fixture: ComponentFixture<InsumosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InsumosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
