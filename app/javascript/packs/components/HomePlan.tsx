import { h } from 'preact';
import { IDatabasePlan } from '../interfaces/IPlan';
import Plan from './Plan';

export interface IHomePlanProps {
  plan: IDatabasePlan;
  isFadingIn: boolean;
  isFadingOut: boolean;
}

export default function HomePlan(props: IHomePlanProps) {
  return (
    <div className={`home-plan ${props.isFadingIn ? 'fade-in' : ''} ${props.isFadingOut ? 'fade-out' : ''}`}>
      <Plan plan={{ title: props.plan.name, description: props.plan.description, days: props.plan.days }} />
    </div>
  )
}