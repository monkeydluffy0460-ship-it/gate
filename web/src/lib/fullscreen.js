import { useEffect } from 'react';

export function useFullscreenGuard(onViolation) {
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onViolation();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onViolation();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onViolation]);
}
