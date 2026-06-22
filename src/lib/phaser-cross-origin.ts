export type SponsorForLogo = {
    id?: number;
    urlLogo?: string;
  };
  
  export type ResolveSponsorLogoOptions = {
    logPrefix?: string;
    /** Fallback quando non c'è logo sponsor (empty / assente). Default: logo Conad. */
    pickDefaultLogo?: () => string;
  
    useConadVersoNaturaFallback?: boolean;
  };
  
  const FALLBACK_SPONSOR_LOGO_DEFAULT = "/images/loghi/logo_conad.png";
  
  export function pickDefaultSponsorLogoConadOrVerso(): string {
    return FALLBACK_SPONSOR_LOGO_DEFAULT;
  }
  
  /**
   * Path assoluto (o URL) da passare a Phaser/registry per il logo sponsor.
   *
   * NOTA: per nessun logo (nobrand) usare `urlLogo` che finisce con `"empty"`.
   */
  export function resolveSponsorLogoPath(
    sponsor: SponsorForLogo | undefined,
    options?: ResolveSponsorLogoOptions,
  ): {sponsorLogo: string; sponsorLogoFileName: string | undefined} {
    const sponsorUrlLogo = sponsor?.urlLogo;
    const sponsorLogoFileName = sponsorUrlLogo?.split("/").pop() ?? sponsorUrlLogo;
    const pickDefault =
      options?.pickDefaultLogo ??
      (options?.useConadVersoNaturaFallback
        ? pickDefaultSponsorLogoConadOrVerso
        : () => FALLBACK_SPONSOR_LOGO_DEFAULT);
  
    const sponsorLogo: string =
      sponsorLogoFileName && sponsorLogoFileName !== "empty"
        ? sponsorLogoFileName.startsWith("http")
          ? sponsorLogoFileName
          : `/images/loghi/${sponsorLogoFileName}`
        : pickDefault();
  
    if (options?.logPrefix !== undefined) {
      console.log(`[${options.logPrefix}] sponsor logo filename: `, sponsorLogoFileName);
    }
  
    return {sponsorLogo, sponsorLogoFileName};
  }
  