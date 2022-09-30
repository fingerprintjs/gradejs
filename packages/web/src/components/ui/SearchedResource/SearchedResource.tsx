import React from 'react';
import styles from './SearchedResource.module.scss';

type Props = {
  image?: string;
  name: string;
  totalPackages: number;
  lastScanDate?: string;
};

export default function SearchedResource({ image, name, totalPackages, lastScanDate }: Props) {
  const lastScanDay =
    lastScanDate &&
    new Date(lastScanDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  const lastScanTime =
    lastScanDate &&
    new Date(lastScanDate).toLocaleTimeString('en-GB', { hour: 'numeric', minute: 'numeric' });

  return (
    <div className={styles.searchedResource}>
      {image && (
        <div className={styles.searchedResourceImageWrapper}>
          <img className={styles.searchedResourceImage} src={image} alt='' />
        </div>
      )}

      <div className={styles.searchedResourceContent}>
        <h3 className={styles.searchedResourceTitle}>
          {name} <span className={styles.searchedResourceHighlight}>{totalPackages} packages</span>
        </h3>
        {!!lastScanDate && (
          <div className={styles.searchedResourceSubtitle}>
            Last scanned on {lastScanDay} at {lastScanTime}
          </div>
        )}
      </div>
    </div>
  );
}
