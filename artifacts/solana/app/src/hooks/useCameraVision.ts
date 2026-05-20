import { useCallback, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';

export type CameraStatus = 'STANDBY' | 'REQUEST' | 'ANALYZING' | 'NO CAM';

export const useCameraVision = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState<boolean>(false);

  const permissionGranted = permission?.granted === true;

  const status: CameraStatus = !permission
    ? 'REQUEST'
    : !permissionGranted
    ? 'NO CAM'
    : isActive
    ? 'ANALYZING'
    : 'STANDBY';

  const requestAccess = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const setActive = useCallback((value: boolean) => {
    setIsActive(value);
  }, []);

  return {
    permissionGranted,
    requestAccess,
    isActive,
    setActive,
    status,
  };
};
