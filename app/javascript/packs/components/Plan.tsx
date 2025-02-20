import { h } from 'preact';
import { IPlan } from '../interfaces/IPlan';
import PlanDay from './PlanDay';
import {planContainer} from './Plan.module.css';

export default function Plan({ plan }: { plan: IPlan }) {
  if (!plan) {
    return null;
  }
  return (
    <section className="border border-primary rounded bg-body p-4">
      <h2>{plan.title}</h2>
      <p>{plan.description}</p>
      <div className={`${planContainer} py-2`}>
        {plan.days && plan.days.map(day => <PlanDay day={day} />)}
      </div>
    </section>
  );
}
