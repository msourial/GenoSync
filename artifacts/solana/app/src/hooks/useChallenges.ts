import { useEffect } from 'react';
import { useChallengesStore } from '../stores/challengesStore';

export const useChallenges = () => {
  const state = useChallengesStore();

  useEffect(() => {
    state.refresh();
  }, [state.refresh]);

  return state;
};

export default useChallenges;
