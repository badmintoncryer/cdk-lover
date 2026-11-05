// cfn-idle-cost ships plain JS without type declarations.
declare module 'cfn-idle-cost' {
  import type { IConstruct } from 'constructs';

  export interface IdleCostOptions {
    /** Fail synth when the total idle cost is over this many USD/month. */
    readonly max?: number;
    /** Warn on each resource idling at this many USD/month or more. */
    readonly warnAbove?: number;
    readonly region?: string;
    readonly args?: string[];
  }

  export class IdleCost {
    static apply(scope: IConstruct, options?: IdleCostOptions): void;
  }
}
