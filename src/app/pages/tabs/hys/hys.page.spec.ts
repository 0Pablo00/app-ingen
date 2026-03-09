import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HysPage } from './hys.page';

describe('HysPage', () => {
  let component: HysPage;
  let fixture: ComponentFixture<HysPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HysPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
