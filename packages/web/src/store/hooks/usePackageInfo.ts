import { useAppDispatch, useAppSelector } from '../index';
import { requestPackageInfo } from '../slices/package';
import { makeSelectPackageInfo } from '../selectors/packageInfo';
import { useUniversalEffect } from './useUniversalEffect';
import { useMemo } from 'react';

export const usePackageInfo = (packageName: string) => {
  const dispatch = useAppDispatch();
  const selectPackageInfo = useMemo(makeSelectPackageInfo, []);
  const info = useAppSelector((state) => selectPackageInfo(state, packageName));

  useUniversalEffect(() => {
    if (
      info?.packageInfo !== null /* 404 */ &&
      (!info?.packageInfo || info?.packageInfo?.name !== packageName) &&
      !info?.isLoading &&
      !info?.error
    ) {
      dispatch(requestPackageInfo({ packageName }));
    }
  }, [info, packageName]);

  return info;
};
