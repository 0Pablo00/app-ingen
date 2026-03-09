import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiresPage } from './aires.page';

describe('AiresPage', () => {
  let component: AiresPage;
  let fixture: ComponentFixture<AiresPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AiresPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
