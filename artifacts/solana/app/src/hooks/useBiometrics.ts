import { useCallback, useEffect, useRef, useState } from 'react';
import { Accelerometer, Gyroscope, Pedometer } from 'expo-sensors';

type RemovableSubscription = { remove: () => void };

type TimedValue = { t: number; v: number };

const WINDOW_MS = 5000;
const GRAVITY_BASELINE = 1;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const variance = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const sq = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return sq;
};

export function useBiometrics(): {
  hrv: number;
  strain: number;
  focus: number;
  apm: number;
  steps: number;
  isMeasuring: boolean;
  start: () => void;
  stop: () => void;
} {
  const [hrv, setHrv] = useState<number>(50);
  const [strain, setStrain] = useState<number>(0);
  const [focus, setFocus] = useState<number>(0);
  const [apm, setApm] = useState<number>(0);
  const [steps, setSteps] = useState<number>(0);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);

  const accelSubRef = useRef<RemovableSubscription | null>(null);
  const gyroSubRef = useRef<RemovableSubscription | null>(null);
  const pedometerSubRef = useRef<RemovableSubscription | null>(null);

  const accelWindowRef = useRef<TimedValue[]>([]);
  const gyroWindowRef = useRef<TimedValue[]>([]);
  const baselineRef = useRef<number>(GRAVITY_BASELINE);
  const cumulativeStrainRef = useRef<number>(0);

  const resetMetrics = useCallback(() => {
    accelWindowRef.current = [];
    gyroWindowRef.current = [];
    baselineRef.current = GRAVITY_BASELINE;
    cumulativeStrainRef.current = 0;
    setHrv(50);
    setStrain(0);
    setFocus(0);
    setApm(0);
    setSteps(0);
  }, []);

  const stop = useCallback(() => {
    accelSubRef.current?.remove();
    gyroSubRef.current?.remove();
    pedometerSubRef.current?.remove();

    accelSubRef.current = null;
    gyroSubRef.current = null;
    pedometerSubRef.current = null;
    setIsMeasuring(false);
  }, []);

  const start = useCallback(() => {
    if (isMeasuring) return;

    resetMetrics();

    try {
      accelSubRef.current = Accelerometer.addListener(({ x, y, z }) => {
        const now = Date.now();
        const mag = Math.sqrt(x * x + y * y + z * z);

        const alpha = 0.92;
        baselineRef.current = alpha * baselineRef.current + (1 - alpha) * mag;

        const aboveBaseline = Math.max(0, mag - baselineRef.current);
        cumulativeStrainRef.current += Math.abs(aboveBaseline);

        const strainScore = clamp(cumulativeStrainRef.current * 3, 0, 100);
        setStrain(strainScore);

        accelWindowRef.current.push({ t: now, v: mag });
        accelWindowRef.current = accelWindowRef.current.filter((p) => now - p.t <= WINDOW_MS);

        const accelValues = accelWindowRef.current.map((p) => p.v);
        const accelVar = variance(accelValues);

        const activityPerMinute = clamp(accelVar * 60 * 100, 0, 999);
        setApm(activityPerMinute);

        if (!gyroSubRef.current) {
          const stillnessFocus = clamp(100 / (1 + accelVar * 80), 0, 100);
          setFocus(stillnessFocus);
          // Derived proxy only; true HRV requires cardiac signal (not phone IMU alone).
          setHrv(50 + 20 * Math.tanh(stillnessFocus / 100));
        }
      }) as unknown as RemovableSubscription;
    } catch {
      accelSubRef.current = null;
    }

    try {
      gyroSubRef.current = Gyroscope.addListener(({ x, y, z }) => {
        const now = Date.now();
        const angMag = Math.sqrt(x * x + y * y + z * z);

        gyroWindowRef.current.push({ t: now, v: angMag });
        gyroWindowRef.current = gyroWindowRef.current.filter((p) => now - p.t <= WINDOW_MS);

        const gyroVar = variance(gyroWindowRef.current.map((p) => p.v));
        const focusScore = clamp(100 / (1 + gyroVar * 50), 0, 100);

        setFocus(focusScore);
        // Derived proxy only; true HRV requires cardiac signal (not phone IMU alone).
        setHrv(50 + 20 * Math.tanh(focusScore / 100));
      }) as unknown as RemovableSubscription;
    } catch {
      gyroSubRef.current = null;
    }

    void (async () => {
      try {
        const isAvailable = await Pedometer.isAvailableAsync();
        if (!isAvailable || typeof Pedometer.watchStepCount !== 'function') {
          return;
        }
        pedometerSubRef.current = Pedometer.watchStepCount((result) => {
          setSteps(typeof result.steps === 'number' ? result.steps : 0);
        }) as unknown as RemovableSubscription;
      } catch {
        pedometerSubRef.current = null;
      }
    })();

    setIsMeasuring(true);
  }, [isMeasuring, resetMetrics]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { hrv, strain, focus, apm, steps, isMeasuring, start, stop };
}
