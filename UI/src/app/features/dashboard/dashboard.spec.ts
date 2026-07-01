import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard';
import { ApiService } from '../../core/services/api.service';
import { of } from 'rxjs';

describe('DashboardComponent', () => {

  let component: DashboardComponent;

  const apiServiceMock = {
    getRevenue: () => of({ totalRevenue: 10000 }),
    getPeakHours: () => of([]),
    getTopDishes: () => of([]),
    getDemandPrediction: () => of([]),
    getAISummary: () => of({ insight: 'AI Insight' })
  };

  beforeEach(async () => {

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        {
          provide: ApiService,
          useValue: apiServiceMock
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardComponent);

    component = fixture.componentInstance;
  });

  it('should create the dashboard component', () => {

    expect(component).toBeTruthy();

  });

  it('should return upward arrow for positive trend', () => {

    expect(component.getTrendArrow(25))
      .toBe('▲');

  });

  it('should return downward arrow for negative trend', () => {

    expect(component.getTrendArrow(-25))
      .toBe('▼');

  });

  it('should return stable arrow for neutral trend', () => {

    expect(component.getTrendArrow(0))
      .toBe('→');

  });

  it('should return green confidence color', () => {

    expect(component.getConfidenceColor(90))
      .toBe('#10B981');

  });

  it('should return yellow confidence color', () => {

    expect(component.getConfidenceColor(70))
      .toBe('#F59E0B');

  });

  it('should return red confidence color', () => {

    expect(component.getConfidenceColor(50))
      .toBe('#EF4444');

  });

  it('should return pizza image path', () => {

    expect(component.getImageByName('Pizza'))
      .toContain('pizza.png');

  });

  it('should return default image for unknown dish', () => {

    expect(component.getImageByName('Sandwich'))
      .toContain('default-food.png');

  });

});