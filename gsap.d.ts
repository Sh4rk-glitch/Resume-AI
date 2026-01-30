declare module 'gsap' {
  export namespace gsap {
    export interface Ticker {
      add(callback: () => void): void;
      remove(callback: () => void): void;
    }

    export interface Timeline {
      kill(): void;
      pause(): void;
      restart(): void;
      to(target: any, vars: any, position?: any): Timeline;
      isActive(): boolean;
    }

    export function to(target: any, vars: any): any;
    export function set(target: any, vars: any): void;
    export function getProperty(target: any, property: string): any;
    export function killTweensOf(target: any, properties?: string): void;
    export function timeline(vars?: any): Timeline;
    export const ticker: Ticker;
  }
}
