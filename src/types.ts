export interface Motan {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  angle: number;
  dAngle: number;
  found: boolean;
  foundTime?: number;
  isHidden: boolean;
  lastTeleportTime?: number;
  element?: HTMLElement | null;
}

export interface Obiect {
  id: number;
  x: number;
  y: number;
  size: number;
  assignedMotanId: number | null;
  element?: HTMLElement | null;
}