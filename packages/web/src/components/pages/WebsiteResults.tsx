import React, { useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams } from 'react-router-dom';
import { Error as ErrorLayout, SearchResults } from 'components/layouts';
import { trackCustomEvent } from '../../services/analytics';
import { useAppDispatch, useAppSelector, websiteResultsSelectors as selectors } from '../../store';
import { useScanResult } from '../../store/hooks/scan/useScanResult';
import {
  makeSelectScanDisplayOptions,
  makeSelectSortedAndFilteredScanPackages,
} from '../../store/selectors/scanDisplayOptions/scanDisplayOptions';
import {
  PackageFilters,
  resetScanDisplayOptions,
  setScanDisplayOptions,
} from '../../store/slices/scanDisplayOptions';
import semver from 'semver';

export function WebsiteResultsPage() {
  const { '*': scanUrl } = useParams();

  const dispatch = useAppDispatch();

  const { displayUrl, normalizedUrl, parsedUrl, scanResult } = useScanResult(scanUrl, {
    pollWhilePending: true,
  });

  const selectScanDisplayOptions = useMemo(() => makeSelectScanDisplayOptions(), []);

  const selectSortedAndFilteredPackages = useMemo(
    () => makeSelectSortedAndFilteredScanPackages(),
    []
  );

  const packagesFilteredAndSorted = useAppSelector((state) =>
    selectSortedAndFilteredPackages(state, normalizedUrl)
  );

  const scanOverview = useAppSelector((state) => selectors.scanOverview(state, normalizedUrl));
  const packageStats = scanOverview.packages;

  const searchableEntities = useAppSelector((state) =>
    selectors.searchableScanEntities(state, normalizedUrl)
  );

  const { isProtected, isPending, isLoading, isFailed, isInvalid } = useAppSelector((state) =>
    selectors.scanState(state, normalizedUrl)
  );

  const availableFilters: PackageFilters = useMemo(
    () => ({
      authors: searchableEntities.packageAuthors.map((it) => it.name),
      keywords: searchableEntities.packageKeywords,
      traits: ['vulnerable', 'outdated'],
    }),
    [searchableEntities]
  );

  const selectedDisplayOptions = useAppSelector((state) =>
    selectScanDisplayOptions(state, normalizedUrl)
  );

  const handleFiltersChange = useCallback(
    (newFilters: PackageFilters | null) => {
      if (!normalizedUrl) {
        return;
      }

      if (newFilters) {
        dispatch(
          setScanDisplayOptions({
            scanUrl: normalizedUrl,
            options: {
              ...selectedDisplayOptions,
              packageFilters: newFilters,
            },
          })
        );
      } else {
        dispatch(resetScanDisplayOptions({ scanUrl: normalizedUrl }));
      }
    },
    [dispatch, normalizedUrl]
  );

  if (isFailed) {
    return (
      <ErrorLayout
        message='An unexpected error occurred. Try visiting us later.'
        action='Would you like to try another URL or report an issue?'
        actionTitle='Try another URL'
        host={displayUrl ?? ''}
      />
    );
  }

  if (isProtected) {
    // TODO: move to tracking middleware?
    trackCustomEvent('HostnamePage', 'SiteProtected');
    return (
      <ErrorLayout
        message='The entered website appears to be protected by a third-party service, such as DDoS prevention, password protection or geolocation restrictions.'
        action='Would you like to try another URL or report an issue?'
        actionTitle='Try another URL...'
        host={displayUrl ?? ''}
      />
    );
  }

  if (!parsedUrl || isInvalid) {
    // TODO: move to tracking middleware?
    trackCustomEvent('HostnamePage', 'SiteInvalid');
    return (
      <ErrorLayout
        message='It looks like the website is not built with Webpack or protected by an anti-bot service.'
        action='Would you like to try another URL or report an issue?'
        actionTitle='Try another URL...'
        host={displayUrl ?? ''}
      />
    );
  }

  const title = `List of NPM packages that are used on ${parsedUrl.hostname} - GradeJS`;
  const description =
    `GradeJS has discovered ${packageStats.total} NPM packages used on ${parsedUrl.hostname}` +
    (packageStats.vulnerable > 0 ? `, ${packageStats.vulnerable} are vulnerable` : '') +
    (packageStats.outdated > 0 ? `, ${packageStats.outdated} are outdated` : '');

  const webpackVersion = scanResult?.scan?.scanResult?.identifiedBundler?.versionRange ?? 'x.x';
  const accuracy = // TODO: remove hardcode
    {
      '3.x': '31.56',
      '4.x': '47.94',
      '5.x': '52.71',
      '4.x || 5.x': '49.73',
    }[webpackVersion] ?? '46.73';

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name='description' content={description} />
        <meta property='og:title' content={title} />
        <meta property='og:description' content={description} />
      </Helmet>
      <SearchResults
        isLoading={isLoading || isPending}
        isPending={isPending || isPending}
        scanUrl={displayUrl ?? ''}
        packages={packagesFilteredAndSorted}
        packagesStats={packageStats}
        vulnerabilitiesCount={scanOverview.vulnerabilities.total}
        scriptsCount={scanOverview.scriptsCount ?? 0}
        bundleSize={scanOverview.bundleSize ?? 0}
        scanDate={scanResult?.scan?.finishedAt}
        selectedFilters={selectedDisplayOptions.packageFilters}
        availableFilters={availableFilters}
        onFiltersChange={handleFiltersChange}
        webpackVersion={webpackVersion}
        accuracy={accuracy}
      />
    </>
  );
}
