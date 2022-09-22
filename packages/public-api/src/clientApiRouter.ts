import * as trpc from '@trpc/server';
// See also: https://colinhacks.com/essays/painless-typesafety
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { z, ZodError } from 'zod';
import { getOrRequestWebPageScan } from './website/service';
import { getAffectingVulnerabilities } from './vulnerabilities/vulnerabilities';
import {
  PackageMetadata,
  PackageVulnerabilityData,
  SerializableEntity,
  toSerializable,
  WebPageScan,
} from '@gradejs-public/shared';
import { getPackageMetadataByPackageNames } from './packageMetadata/packageMetadataService';

// created for each request
export const createContext = (_: CreateExpressContextOptions) => ({}); // no context
type Context = trpc.inferAsyncReturnType<typeof createContext>;

type ScanResultPackageWithMetadata = WebPageScan.IdentifiedPackage & {
  registryMetadata?: PackageMetadata;
};

export namespace ClientApi {
  export type PackageVulnerabilityResponse = SerializableEntity<PackageVulnerabilityData>;
  export type ScanResultPackageResponse = SerializableEntity<ScanResultPackageWithMetadata>;
}

function mergeRegistryMetadata(
  packages: WebPageScan.IdentifiedPackage[],
  registryMetadata: Record<string, PackageMetadata>
) {
  return packages.map((it) => ({
    ...it,
    registryMetadata: registryMetadata[it.name],
  }));
}

type RequestWebPageScanResponse = {
  id: string;
  status: WebPageScan.Status;
  finishedAt?: string;
  scanResult?: {
    identifiedModuleMap: Record<string, WebPageScan.IdentifiedModule>;
    identifiedPackages: ScanResultPackageWithMetadata[];
    vulnerabilities: Record<string, PackageVulnerabilityData[]>;
  };
};

export const appRouter = trpc
  .router<Context>()
  .mutation('getOrRequestWebPageScan', {
    input: z.object({
      url: z.string().url(),
      rescan: z.boolean().optional(),
    }),
    async resolve({ input: { url, rescan } }) {
      const scan = await getOrRequestWebPageScan(url, rescan);
      if (!scan) {
        // TODO: 404
        throw new Error('Not found');
      }

      const scanResponse: RequestWebPageScanResponse = {
        id: scan.id.toString(),
        status: scan.status,
        finishedAt: scan.finishedAt?.toString(),
        scanResult: undefined,
      };

      if (scan.scanResult) {
        const packageNames = scan.scanResult.identifiedPackages.map((it) => it.name);

        const [metadata, vulnerabilities] = await Promise.all([
          getPackageMetadataByPackageNames(packageNames),
          getAffectingVulnerabilities(scan.scanResult),
        ]);

        scanResponse.scanResult = {
          identifiedModuleMap: scan.scanResult.identifiedModuleMap,
          identifiedPackages: mergeRegistryMetadata(scan.scanResult.identifiedPackages, metadata),
          vulnerabilities,
        };
      }

      return toSerializable(scanResponse);
    },
  })
  .formatError(({ shape, error }) => {
    // TODO: proper reporting
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  });

// export type definition of API
export type ClientApiRouter = typeof appRouter;
