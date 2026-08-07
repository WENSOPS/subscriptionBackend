import { randomUUID } from "crypto";

/** Prefixes for prefixed-UUID primary keys (e.g. USER_<uuid>, subs_<uuid>). */
export const ID_PREFIX = {
  USER: "USER_",
  SERVICE: "SERV_",
  OFFERS: "OFRS_",
  PACKAGE: "PACK_",
  PACKAGE_MEDIA: "PMED_",
  PACKAGE_SERVICE: "PSVC_",
  COUPON: "COUP_",
  ORDER: "ORDR_",
  SUBSCRIPTION: "subs_",
  TRIP: "TRIP_",
  BOOKING: "BOOK_",
  OFFER: "OFFR_",
  OFFER_BENEFIT: "OFBN_",
  REFERRAL_PROGRAM: "REFP_",
  REFERRAL_TRIGGER_PACKAGE: "RTPK_",
  REFERRAL_PROGRAM_REFERRER_PACKAGE: "RPRP_",
  REFERRAL_PROGRAM_REFEREE_PACKAGE: "RPFP_",
  USER_REFERRAL_CATEGORY_TRACK: "URCT_",
  TRACK_REFERRAL: "TRRF_",
  REFERRAL_REWARD: "RWRD_",
};

export function generatePrefixedId(prefix) {
  return `${prefix}${randomUUID()}`;
}

export const generateId = {
  user: () => generatePrefixedId(ID_PREFIX.USER),
  service: () => generatePrefixedId(ID_PREFIX.SERVICE),
  offers: () => generatePrefixedId(ID_PREFIX.OFFERS),
  package: () => generatePrefixedId(ID_PREFIX.PACKAGE),
  packageMedia: () => generatePrefixedId(ID_PREFIX.PACKAGE_MEDIA),
  packageService: () => generatePrefixedId(ID_PREFIX.PACKAGE_SERVICE),
  coupon: () => generatePrefixedId(ID_PREFIX.COUPON),
  order: () => generatePrefixedId(ID_PREFIX.ORDER),
  subscription: () => generatePrefixedId(ID_PREFIX.SUBSCRIPTION),
  trip: () => generatePrefixedId(ID_PREFIX.TRIP),
  booking: () => generatePrefixedId(ID_PREFIX.BOOKING),
  offer: () => generatePrefixedId(ID_PREFIX.OFFER),
  offerBenefit: () => generatePrefixedId(ID_PREFIX.OFFER_BENEFIT),
  referralProgram: () => generatePrefixedId(ID_PREFIX.REFERRAL_PROGRAM),
  referralTriggerPackage: () =>
    generatePrefixedId(ID_PREFIX.REFERRAL_TRIGGER_PACKAGE),
  referralProgramReferrerPackage: () =>
    generatePrefixedId(ID_PREFIX.REFERRAL_PROGRAM_REFERRER_PACKAGE),
  referralProgramRefereePackage: () =>
    generatePrefixedId(ID_PREFIX.REFERRAL_PROGRAM_REFEREE_PACKAGE),
  userReferralCategoryTrack: () =>
    generatePrefixedId(ID_PREFIX.USER_REFERRAL_CATEGORY_TRACK),
  trackReferral: () => generatePrefixedId(ID_PREFIX.TRACK_REFERRAL),
  referralReward: () => generatePrefixedId(ID_PREFIX.REFERRAL_REWARD),
};
