import { useState, useEffect, useCallback, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';

export const useCameraVision = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState<boolean>(false);
  const [secondsActive, setSecondsActive] = useState<number>(0);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const permissionGranted = permission?.granted === true;
  
  const updateStatus = useCallback((): 'STANDBY'|'REQUEST'|'ANALYZING'|'NO CAM' => {
    if (!permission) return 'REQUEST';
    if (!permissionGranted) return 'NO CAM';
    return isActive ? 'ANALYZING' : 'STANDBY';
  }, [permission, permissionGranted, isActive]);
  
  const status = updateStatus();
  
  useEffect(() => {
    if (isActive && permissionGranted) {
      intervalRef.current = setInterval(() => {
        setSecondsActive(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, permissionGranted]);
  
  const requestAccess = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);
  
  const setActive = useCallback((value: boolean) => {
    setIsActive(value);
    if (!value) {
      setSecondsActive(0);
    }
  }, []);
  
  return {
    permissionGranted,
    requestAccess,
    isActive,
    setActive,
    status,
    secondsActive
  };
};