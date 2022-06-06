import {
  GithubAdvisoryDatabaseSpecific,
  GithubAdvisorySeverity,
  PackageVulnerability,
  WebPagePackage,
} from '@gradejs-public/shared';
import { getRepository } from 'typeorm';
import semver from 'semver';

export type ApiPackageVulnerabilityData = {
  affectedPackageName: string;
  affectedVersionRange: string;
  osvId: string;
  detailsUrl: string;
  summary?: string;
  severity?: GithubAdvisorySeverity;
};

export async function getVulnerabilitiesByPackageNames(packageNames: string[]) {
  if (packageNames.length === 0) {
    return [];
  }

  const vulnerabilitiesQuery = getRepository(PackageVulnerability)
    .createQueryBuilder('pv')
    .where('pv.packageName in (:...packageNames)', { packageNames });

  return vulnerabilitiesQuery.getMany();
}

export async function getAffectingVulnerabilities(packages: WebPagePackage[]) {
  const affectingVulnerabilitiesByPackage: Record<string, ApiPackageVulnerabilityData[]> = {};
  if (!packages.length) {
    return affectingVulnerabilitiesByPackage;
  }

  const packagesByNames = packages.reduce((acc, pkg) => {
    acc[pkg.packageName] = pkg;
    return acc;
  }, {} as Record<string, WebPagePackage>);

  const vulnerabilitiesByPackage = await getVulnerabilitiesByPackageNames(
    Object.keys(packagesByNames)
  );

  for (const vulnerability of vulnerabilitiesByPackage) {
    const relatedPackage = packagesByNames[vulnerability.packageName]!;
    const affectsReportedRange = semver.subset(
      relatedPackage.packageVersionRange,
      vulnerability.packageVersionRange,
      { loose: true }
    );

    if (!affectsReportedRange) {
      continue;
    }

    if (!affectingVulnerabilitiesByPackage[vulnerability.packageName]) {
      affectingVulnerabilitiesByPackage[vulnerability.packageName] = [];
    }

    const osvGithubDatabaseSpecific = vulnerability.osvData
      .database_specific as GithubAdvisoryDatabaseSpecific;

    affectingVulnerabilitiesByPackage[vulnerability.packageName].push({
      affectedPackageName: vulnerability.packageName,
      affectedVersionRange: vulnerability.packageVersionRange,
      osvId: vulnerability.osvId,
      detailsUrl: `https://github.com/advisories/${vulnerability.osvId}`,
      summary: vulnerability.osvData.summary,
      severity: osvGithubDatabaseSpecific.severity,
    });
  }

  return affectingVulnerabilitiesByPackage;
}
