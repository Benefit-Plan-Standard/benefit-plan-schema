"""
Build the seven carrier example plan files for BPS v1.1.0.

Each plan covers ~18 benefits spanning the SBC service inventory:
  - Office visits (PCP, specialist, preventive, telehealth)
  - Diagnostic test, lab, imaging (standard, advanced)
  - Prescription drugs (generic, preferred brand, non-preferred brand, specialty)
  - Emergency room, urgent care, ambulance
  - Outpatient surgery (facility + professional)
  - Inpatient hospital
  - Mental health outpatient + inpatient
  - Prenatal care, delivery (professional + facility)
  - Home health, rehab, skilled nursing, DME, hospice
  - Pediatric vision + dental (where applicable)

PPO-style plans (Aetna, Blue Cross, Cigna, GatorCare) emit both IN and OUT
tiers and use all 8 accumulator slots. HMO-style plans (Humana, SCAN) emit
IN only (plus an emergency OON tier where the carrier covers it). UHC's
Medicare Advantage plan emits IN + OON_EMERG.

Run from the repo root:
    python scripts/build_examples.py
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Shared SBC benefit catalog. Each entry is the BPS shape minus the
# network_cost_shares (which is filled in per carrier).
# ---------------------------------------------------------------------------

CATALOG: list[dict[str, Any]] = [
    # If you visit a healthcare provider's office or clinic
    dict(benefit_id="PCP_VISIT",        benefit_type="medical", canonical_key="primary_care",
         category="PHYSICIAN_SERVICES", service_name="Primary care visit",
         place_of_service=["office"]),
    dict(benefit_id="SPECIALIST_VISIT", benefit_type="medical", canonical_key="specialist",
         category="PHYSICIAN_SERVICES", service_name="Specialist office visit",
         place_of_service=["office"]),
    dict(benefit_id="PREVENTIVE_CARE",  benefit_type="medical", canonical_key="preventive_care",
         category="PREVENTIVE_CARE",    service_name="Preventive care / screening / immunization",
         place_of_service=["office"]),
    dict(benefit_id="TELEHEALTH",       benefit_type="medical", canonical_key="telehealth_visit",
         category="TELEHEALTH",         service_name="Telehealth virtual visit",
         place_of_service=["virtual"]),

    # If you have a test
    dict(benefit_id="DIAGNOSTIC_LAB",   benefit_type="medical", canonical_key="diagnostic_lab",
         category="DIAGNOSTIC_SERVICES", service_name="Laboratory tests",
         place_of_service=["laboratory", "office"]),
    dict(benefit_id="IMAGING_STANDARD", benefit_type="medical", canonical_key="imaging_standard",
         category="DIAGNOSTIC_SERVICES", service_name="Diagnostic imaging (X-ray, ultrasound)",
         place_of_service=["office", "outpatient"]),
    dict(benefit_id="IMAGING_ADVANCED", benefit_type="medical", canonical_key="imaging_advanced",
         category="DIAGNOSTIC_SERVICES", service_name="Advanced imaging (CT, MRI, PET)",
         place_of_service=["outpatient", "office"]),

    # Drugs
    dict(benefit_id="RX_GENERIC",       benefit_type="pharmacy", canonical_key="generic_drugs",
         category="PHARMACY",           service_name="Generic drugs",
         place_of_service=["pharmacy"]),
    dict(benefit_id="RX_BRAND_PREF",    benefit_type="pharmacy", canonical_key="preferred_brand_drugs",
         category="PHARMACY",           service_name="Preferred brand drugs",
         place_of_service=["pharmacy"]),
    dict(benefit_id="RX_BRAND_NONPREF", benefit_type="pharmacy", canonical_key="nonpreferred_brand_drugs",
         category="PHARMACY",           service_name="Non-preferred brand drugs",
         place_of_service=["pharmacy"]),
    dict(benefit_id="RX_SPECIALTY",     benefit_type="pharmacy", canonical_key="specialty_drugs",
         category="PHARMACY",           service_name="Specialty drugs",
         place_of_service=["pharmacy"]),

    # Outpatient surgery
    dict(benefit_id="OUTPATIENT_SURG_FACILITY",  benefit_type="medical",
         canonical_key="outpatient_surgery_facility",
         category="SURGICAL_SERVICES",  service_name="Outpatient surgery facility fee",
         place_of_service=["outpatient", "ambulatory_surgery_center"]),
    dict(benefit_id="OUTPATIENT_SURG_PROFESSIONAL", benefit_type="medical",
         canonical_key="outpatient_surgery_surgeon",
         category="SURGICAL_SERVICES",  service_name="Outpatient surgery physician/surgeon fee",
         place_of_service=["outpatient", "ambulatory_surgery_center"]),

    # If you need immediate medical attention
    dict(benefit_id="EMERGENCY_ROOM",   benefit_type="medical", canonical_key="emergency_room",
         category="EMERGENCY_CARE",     service_name="Emergency room services",
         place_of_service=["hospital", "emergency_room"]),
    dict(benefit_id="URGENT_CARE",      benefit_type="medical", canonical_key="urgent_care",
         category="URGENT_CARE",        service_name="Urgent care visit",
         place_of_service=["urgent_care"]),
    dict(benefit_id="AMBULANCE",        benefit_type="medical", canonical_key="ambulance",
         category="EMERGENCY_CARE",     service_name="Ambulance services",
         place_of_service=["ambulance"]),

    # If you have a hospital stay
    dict(benefit_id="INPATIENT_HOSPITAL_FACILITY",  benefit_type="medical",
         canonical_key="inpatient_hospital_facility",
         category="HOSPITAL_SERVICES",  service_name="Inpatient hospital facility fee",
         place_of_service=["hospital"]),
    dict(benefit_id="INPATIENT_HOSPITAL_PHYSICIAN", benefit_type="medical",
         canonical_key="inpatient_hospital_physician",
         category="HOSPITAL_SERVICES",  service_name="Inpatient hospital physician/surgeon fee",
         place_of_service=["hospital"]),

    # Mental health, behavioral health, or substance abuse
    dict(benefit_id="MENTAL_HEALTH_OUTPATIENT", benefit_type="behavioral_health",
         canonical_key="mental_health_outpatient",
         category="BEHAVIORAL_HEALTH",  service_name="Mental/behavioral health outpatient services",
         place_of_service=["office", "outpatient"]),
    dict(benefit_id="MENTAL_HEALTH_INPATIENT",  benefit_type="behavioral_health",
         canonical_key="mental_health_inpatient",
         category="BEHAVIORAL_HEALTH",  service_name="Mental/behavioral health inpatient services",
         place_of_service=["hospital"]),

    # If you are pregnant
    dict(benefit_id="PRENATAL_CARE",   benefit_type="maternity", canonical_key="prenatal_care",
         category="MATERNITY_CARE",    service_name="Office visits — prenatal",
         place_of_service=["office"]),
    dict(benefit_id="DELIVERY_PROFESSIONAL", benefit_type="maternity",
         canonical_key="delivery_professional",
         category="MATERNITY_CARE",    service_name="Childbirth/delivery professional services",
         place_of_service=["hospital"]),
    dict(benefit_id="DELIVERY_FACILITY",     benefit_type="maternity",
         canonical_key="delivery_facility",
         category="MATERNITY_CARE",    service_name="Childbirth/delivery facility services",
         place_of_service=["hospital"]),

    # If you need help recovering or have other special health needs
    dict(benefit_id="HOME_HEALTH_CARE",  benefit_type="medical", canonical_key="home_health_care",
         category="HOME_HEALTH",        service_name="Home health care",
         place_of_service=["home"]),
    dict(benefit_id="REHAB_SERVICES",    benefit_type="medical", canonical_key="rehabilitation_services",
         category="REHABILITATION",     service_name="Rehabilitation services (PT/OT/ST)",
         place_of_service=["office", "outpatient"]),
    dict(benefit_id="SKILLED_NURSING",   benefit_type="medical", canonical_key="skilled_nursing_facility",
         category="SKILLED_NURSING",    service_name="Skilled nursing facility",
         place_of_service=["snf"]),
    dict(benefit_id="DME",               benefit_type="medical", canonical_key="durable_medical_equipment",
         category="DURABLE_MEDICAL_EQUIPMENT", service_name="Durable medical equipment",
         place_of_service=["home", "office"]),
    dict(benefit_id="HOSPICE",           benefit_type="medical", canonical_key="hospice_care",
         category="HOME_HEALTH",        service_name="Hospice services",
         place_of_service=["home", "hospital"]),

    # Pediatric (medical-plan EHB)
    dict(benefit_id="PEDIATRIC_EYE_EXAM",   benefit_type="vision",
         canonical_key="pediatric_eye_exam",
         category="VISION_PEDIATRIC",     service_name="Children's eye exam",
         place_of_service=["office"]),
    dict(benefit_id="PEDIATRIC_DENTAL_CHECKUP", benefit_type="dental",
         canonical_key="pediatric_dental_checkup",
         category="DENTAL_PEDIATRIC",     service_name="Children's dental check-up",
         place_of_service=["office"]),
]


# ---------------------------------------------------------------------------
# Cost-share helpers. We construct `network_cost_shares` per carrier per
# benefit using these primitives. Each carrier's shape lookup picks one.
# ---------------------------------------------------------------------------

def cs_copay(seq: int, amount: float, *, basis: str = "per_visit",
             applies_ded: bool = False, applies_moop: bool = True) -> dict:
    return {"type": "copay", "sequence": seq, "amount": amount, "basis": basis,
            "applies_to_deductible": applies_ded, "applies_to_moop": applies_moop}


def cs_coins(seq: int, rate: float, *, basis: str = "allowed_amount",
             applies_ded: bool = True, applies_moop: bool = True) -> dict:
    return {"type": "coinsurance", "sequence": seq, "rate": rate, "basis": basis,
            "applies_to_deductible": applies_ded, "applies_to_moop": applies_moop}


def cs_ded_then(seq: int, rate: float = 1.0) -> dict:
    return {"type": "deductible", "sequence": seq, "rate": rate,
            "basis": "allowed_amount", "applies_to_deductible": True,
            "applies_to_moop": True}


def cs_nocharge(seq: int = 1) -> dict:
    return {"type": "copay", "sequence": seq, "amount": 0, "basis": "per_visit",
            "applies_to_deductible": False, "applies_to_moop": True}


def tier(tier_id: str, covered: bool, *cost_shares: dict,
         notes: str | None = None) -> dict:
    t: dict[str, Any] = {"tier_id": tier_id, "covered": covered,
                         "cost_shares": list(cost_shares)}
    if notes is not None:
        t["notes"] = notes
    return t


def not_covered(tier_id: str, notes: str = "Not covered.") -> dict:
    return {"tier_id": tier_id, "covered": False, "cost_shares": [], "notes": notes}


# ---------------------------------------------------------------------------
# Per-carrier cost-share specs.
#
# For each carrier we define a dict mapping benefit_id -> network_cost_shares.
# Where a benefit follows the carrier's "default" pattern we omit it and the
# loop applies a sensible default for that carrier's network model.
# ---------------------------------------------------------------------------

def aetna_cost_shares() -> dict[str, list[dict]]:
    """Aetna PPO 1500 80/50: in 20% / OON 50% after $1500/$3000 OON ded."""
    return {
        "PCP_VISIT":             [tier("IN", True, cs_copay(1, 25, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "SPECIALIST_VISIT":      [tier("IN", True, cs_copay(1, 50, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "PREVENTIVE_CARE":       [tier("IN", True, cs_nocharge(),
                                       notes="No charge in-network; ACA preventive."),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "TELEHEALTH":            [tier("IN", True, cs_copay(1, 0, applies_ded=False),
                                       notes="No charge for in-network telehealth."),
                                  tier("OUT", False, notes="Not covered out-of-network.")],
        "DIAGNOSTIC_LAB":        [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "IMAGING_STANDARD":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "IMAGING_ADVANCED":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50),
                                       notes="Prior authorization required.")],
        "RX_GENERIC":            [tier("IN", True, cs_copay(1, 10, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT", "Out-of-network pharmacy not covered.")],
        "RX_BRAND_PREF":         [tier("IN", True, cs_copay(1, 40, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_BRAND_NONPREF":      [tier("IN", True, cs_copay(1, 80, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_SPECIALTY":          [tier("IN", True, cs_coins(1, 0.30, basis="per_prescription")),
                                  not_covered("OUT")],
        "OUTPATIENT_SURG_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "OUTPATIENT_SURG_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "EMERGENCY_ROOM":        [tier("IN", True, cs_copay(1, 300, applies_ded=False),
                                       cs_coins(2, 0.20),
                                       notes="Copay waived if admitted within 24 hours."),
                                  tier("OUT", True, cs_copay(1, 300, applies_ded=False),
                                       cs_coins(2, 0.20),
                                       notes="Covered at in-network level for true emergencies.")],
        "URGENT_CARE":           [tier("IN", True, cs_copay(1, 50, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "AMBULANCE":             [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_coins(1, 0.20),
                                       notes="Covered at in-network level for true emergencies.")],
        "INPATIENT_HOSPITAL_FACILITY":  [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50),
                                              notes="Prior authorization required.")],
        "INPATIENT_HOSPITAL_PHYSICIAN": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "MENTAL_HEALTH_OUTPATIENT":     [tier("IN", True, cs_copay(1, 25, applies_ded=False)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "MENTAL_HEALTH_INPATIENT":      [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "PRENATAL_CARE":         [tier("IN", True, cs_nocharge(),
                                       notes="Preventive prenatal visits at no charge."),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "DELIVERY_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "DELIVERY_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "HOME_HEALTH_CARE":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "REHAB_SERVICES":        [tier("IN", True, cs_copay(1, 25, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "SKILLED_NURSING":       [tier("IN", True, cs_coins(1, 0.20),
                                       notes="Limited to 60 days per benefit period."),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "DME":                   [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "HOSPICE":               [tier("IN", True, cs_nocharge(),
                                       notes="No charge in-network."),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "PEDIATRIC_EYE_EXAM":    [tier("IN", True, cs_nocharge(),
                                       notes="One exam per year for children under 19."),
                                  not_covered("OUT")],
        "PEDIATRIC_DENTAL_CHECKUP": [tier("IN", True, cs_nocharge(),
                                          notes="Two visits per year for children under 19."),
                                     not_covered("OUT")],
    }


def bluecross_cost_shares() -> dict[str, list[dict]]:
    """Blue Cross BlueOptions 505: in 0% or copay / OON 50% coins after ded."""
    return {
        "PCP_VISIT":             [tier("IN", True, cs_copay(1, 35, applies_ded=False),
                                       notes="Value Choice provider visits at no charge."),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40),
                                       notes="Virtual visits not covered out-of-network.")],
        "SPECIALIST_VISIT":      [tier("IN", True, cs_copay(1, 60, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "PREVENTIVE_CARE":       [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "TELEHEALTH":            [tier("IN", True, cs_copay(1, 0, applies_ded=False)),
                                  not_covered("OUT")],
        "DIAGNOSTIC_LAB":        [tier("IN", True, cs_copay(1, 25, basis="per_test",
                                                            applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "IMAGING_STANDARD":      [tier("IN", True, cs_copay(1, 75, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "IMAGING_ADVANCED":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40),
                                       notes="Prior authorization required.")],
        "RX_GENERIC":            [tier("IN", True, cs_copay(1, 10, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_BRAND_PREF":         [tier("IN", True, cs_coins(1, 0.40, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_BRAND_NONPREF":      [tier("IN", True, cs_coins(1, 0.50, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_SPECIALTY":          [tier("IN", True, cs_coins(1, 0.50, basis="per_prescription")),
                                  not_covered("OUT")],
        "OUTPATIENT_SURG_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "OUTPATIENT_SURG_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "EMERGENCY_ROOM":        [tier("IN", True, cs_copay(1, 350, applies_ded=False),
                                       cs_coins(2, 0.20),
                                       notes="Copay waived if admitted."),
                                  tier("IN", True, cs_copay(1, 350, applies_ded=False),
                                       cs_coins(2, 0.20),
                                       notes="OON emergency covered at in-network level.")],
        "URGENT_CARE":           [tier("IN", True, cs_copay(1, 60, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "AMBULANCE":             [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_coins(1, 0.20))],
        "INPATIENT_HOSPITAL_FACILITY":  [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "INPATIENT_HOSPITAL_PHYSICIAN": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "MENTAL_HEALTH_OUTPATIENT":     [tier("IN", True, cs_copay(1, 35, applies_ded=False)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "MENTAL_HEALTH_INPATIENT":      [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "PRENATAL_CARE":         [tier("IN", True, cs_nocharge(),
                                       notes="Routine prenatal care at no charge.")],
        "DELIVERY_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "DELIVERY_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "HOME_HEALTH_CARE":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "REHAB_SERVICES":        [tier("IN", True, cs_copay(1, 35, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "SKILLED_NURSING":       [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "DME":                   [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "HOSPICE":               [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "PEDIATRIC_EYE_EXAM":    [tier("IN", True, cs_nocharge()),
                                  not_covered("OUT")],
        "PEDIATRIC_DENTAL_CHECKUP": [tier("IN", True, cs_nocharge()),
                                     not_covered("OUT")],
    }


def cigna_cost_shares() -> dict[str, list[dict]]:
    """Cigna OAP: in 20% / OON 40% after ded."""
    return {
        "PCP_VISIT":             [tier("IN", True, cs_copay(1, 30, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "SPECIALIST_VISIT":      [tier("IN", True, cs_copay(1, 60, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "PREVENTIVE_CARE":       [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "TELEHEALTH":            [tier("IN", True, cs_copay(1, 0, applies_ded=False)),
                                  not_covered("OUT")],
        "DIAGNOSTIC_LAB":        [tier("IN", True, cs_copay(1, 25, basis="per_test",
                                                            applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "IMAGING_STANDARD":      [tier("IN", True, cs_copay(1, 60, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "IMAGING_ADVANCED":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "RX_GENERIC":            [tier("IN", True, cs_copay(1, 12, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_BRAND_PREF":         [tier("IN", True, cs_copay(1, 45, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_BRAND_NONPREF":      [tier("IN", True, cs_copay(1, 90, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_SPECIALTY":          [tier("IN", True, cs_coins(1, 0.30, basis="per_prescription")),
                                  not_covered("OUT")],
        "OUTPATIENT_SURG_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "OUTPATIENT_SURG_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "EMERGENCY_ROOM":        [tier("IN", True, cs_copay(1, 250, applies_ded=False),
                                       cs_coins(2, 0.20),
                                       notes="Copay waived if admitted.")],
        "URGENT_CARE":           [tier("IN", True, cs_copay(1, 50, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "AMBULANCE":             [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_coins(1, 0.20))],
        "INPATIENT_HOSPITAL_FACILITY":  [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "INPATIENT_HOSPITAL_PHYSICIAN": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "MENTAL_HEALTH_OUTPATIENT":     [tier("IN", True, cs_copay(1, 30, applies_ded=False)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "MENTAL_HEALTH_INPATIENT":      [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "PRENATAL_CARE":         [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "DELIVERY_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "DELIVERY_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "HOME_HEALTH_CARE":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "REHAB_SERVICES":        [tier("IN", True, cs_copay(1, 30, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "SKILLED_NURSING":       [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "DME":                   [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "HOSPICE":               [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.40))],
        "PEDIATRIC_EYE_EXAM":    [tier("IN", True, cs_nocharge()),
                                  not_covered("OUT")],
        "PEDIATRIC_DENTAL_CHECKUP": [tier("IN", True, cs_nocharge()),
                                     not_covered("OUT")],
    }


def gatorcare_cost_shares() -> dict[str, list[dict]]:
    return {
        "PCP_VISIT":             [tier("IN", True, cs_copay(1, 30, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "SPECIALIST_VISIT":      [tier("IN", True, cs_copay(1, 45, applies_ded=False),
                                       notes="No referral required."),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "PREVENTIVE_CARE":       [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "TELEHEALTH":            [tier("IN", True, cs_copay(1, 0, applies_ded=False)),
                                  not_covered("OUT")],
        "DIAGNOSTIC_LAB":        [tier("IN", True, cs_copay(1, 20, basis="per_test",
                                                            applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "IMAGING_STANDARD":      [tier("IN", True, cs_copay(1, 50, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "IMAGING_ADVANCED":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "RX_GENERIC":            [tier("IN", True, cs_copay(1, 10, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_BRAND_PREF":         [tier("IN", True, cs_copay(1, 40, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_BRAND_NONPREF":      [tier("IN", True, cs_copay(1, 75, basis="per_prescription",
                                                            applies_ded=False)),
                                  not_covered("OUT")],
        "RX_SPECIALTY":          [tier("IN", True, cs_coins(1, 0.30, basis="per_prescription")),
                                  not_covered("OUT")],
        "OUTPATIENT_SURG_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "OUTPATIENT_SURG_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "EMERGENCY_ROOM":        [tier("IN", True, cs_copay(1, 250, applies_ded=False),
                                       cs_coins(2, 0.20),
                                       notes="Copay waived if admitted.")],
        "URGENT_CARE":           [tier("IN", True, cs_copay(1, 45, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "AMBULANCE":             [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_coins(1, 0.20))],
        "INPATIENT_HOSPITAL_FACILITY":  [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "INPATIENT_HOSPITAL_PHYSICIAN": [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "MENTAL_HEALTH_OUTPATIENT":     [tier("IN", True, cs_copay(1, 30, applies_ded=False)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "MENTAL_HEALTH_INPATIENT":      [tier("IN", True, cs_coins(1, 0.20)),
                                         tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "PRENATAL_CARE":         [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "DELIVERY_PROFESSIONAL": [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "DELIVERY_FACILITY":     [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "HOME_HEALTH_CARE":      [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "REHAB_SERVICES":        [tier("IN", True, cs_copay(1, 30, applies_ded=False)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "SKILLED_NURSING":       [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "DME":                   [tier("IN", True, cs_coins(1, 0.20)),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "HOSPICE":               [tier("IN", True, cs_nocharge()),
                                  tier("OUT", True, cs_ded_then(1), cs_coins(2, 0.50))],
        "PEDIATRIC_EYE_EXAM":    [tier("IN", True, cs_nocharge()),
                                  not_covered("OUT")],
        "PEDIATRIC_DENTAL_CHECKUP": [tier("IN", True, cs_nocharge()),
                                     not_covered("OUT")],
    }


def humana_cost_shares() -> dict[str, list[dict]]:
    """Humana Gold Plus HMO (Medicare Advantage): IN tier only."""
    return {
        "PCP_VISIT":             [tier("IN", True, cs_copay(1, 0, applies_ded=False),
                                       notes="No charge for primary care.")],
        "SPECIALIST_VISIT":      [tier("IN", True, cs_copay(1, 40, applies_ded=False),
                                       notes="Referral required.")],
        "PREVENTIVE_CARE":       [tier("IN", True, cs_nocharge())],
        "TELEHEALTH":            [tier("IN", True, cs_copay(1, 0, applies_ded=False))],
        "DIAGNOSTIC_LAB":        [tier("IN", True, cs_copay(1, 10, basis="per_test",
                                                            applies_ded=False))],
        "IMAGING_STANDARD":      [tier("IN", True, cs_copay(1, 35, applies_ded=False))],
        "IMAGING_ADVANCED":      [tier("IN", True, cs_copay(1, 175, applies_ded=False),
                                       notes="Prior authorization required.")],
        "RX_GENERIC":            [tier("IN", True, cs_copay(1, 5, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_BRAND_PREF":         [tier("IN", True, cs_copay(1, 45, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_BRAND_NONPREF":      [tier("IN", True, cs_copay(1, 100, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_SPECIALTY":          [tier("IN", True, cs_coins(1, 0.33, basis="per_prescription",
                                                            applies_ded=False))],
        "OUTPATIENT_SURG_FACILITY":     [tier("IN", True, cs_copay(1, 300, applies_ded=False))],
        "OUTPATIENT_SURG_PROFESSIONAL": [tier("IN", True, cs_copay(1, 0, applies_ded=False),
                                              notes="Included with facility copay.")],
        "EMERGENCY_ROOM":        [tier("IN", True, cs_copay(1, 100, applies_ded=False),
                                       notes="Copay waived if admitted.")],
        "URGENT_CARE":           [tier("IN", True, cs_copay(1, 50, applies_ded=False))],
        "AMBULANCE":             [tier("IN", True, cs_copay(1, 300, basis="per_trip",
                                                            applies_ded=False))],
        "INPATIENT_HOSPITAL_FACILITY":  [tier("IN", True,
                                              cs_copay(1, 250, basis="per_day", applies_ded=False),
                                              notes="$250/day for days 1-5; no charge thereafter.")],
        "INPATIENT_HOSPITAL_PHYSICIAN": [tier("IN", True, cs_nocharge(),
                                              notes="Included with facility copay.")],
        "MENTAL_HEALTH_OUTPATIENT":     [tier("IN", True, cs_copay(1, 35, applies_ded=False))],
        "MENTAL_HEALTH_INPATIENT":      [tier("IN", True,
                                              cs_copay(1, 250, basis="per_day", applies_ded=False),
                                              notes="$250/day for days 1-5; no charge thereafter.")],
        "PRENATAL_CARE":         [tier("IN", True, cs_nocharge())],
        "DELIVERY_PROFESSIONAL": [tier("IN", True, cs_copay(1, 200, applies_ded=False))],
        "DELIVERY_FACILITY":     [tier("IN", True,
                                       cs_copay(1, 250, basis="per_day", applies_ded=False))],
        "HOME_HEALTH_CARE":      [tier("IN", True, cs_nocharge())],
        "REHAB_SERVICES":        [tier("IN", True, cs_copay(1, 20, applies_ded=False))],
        "SKILLED_NURSING":       [tier("IN", True,
                                       cs_copay(1, 0, basis="per_day", applies_ded=False),
                                       notes="Days 1-20: $0; days 21-100: $204/day; limit 100 days.")],
        "DME":                   [tier("IN", True, cs_coins(1, 0.20, applies_ded=False))],
        "HOSPICE":               [tier("IN", True, cs_nocharge(),
                                       notes="Covered by Original Medicare.")],
    }


def scan_cost_shares() -> dict[str, list[dict]]:
    """SCAN Classic HMO (Medicare Advantage): IN only, OOP-max-only plan."""
    return {
        "PCP_VISIT":             [tier("IN", True, cs_copay(1, 0, applies_ded=False))],
        "SPECIALIST_VISIT":      [tier("IN", True, cs_copay(1, 35, applies_ded=False))],
        "PREVENTIVE_CARE":       [tier("IN", True, cs_nocharge())],
        "TELEHEALTH":            [tier("IN", True, cs_copay(1, 0, applies_ded=False))],
        "DIAGNOSTIC_LAB":        [tier("IN", True, cs_copay(1, 0, basis="per_test",
                                                            applies_ded=False))],
        "IMAGING_STANDARD":      [tier("IN", True, cs_copay(1, 25, applies_ded=False))],
        "IMAGING_ADVANCED":      [tier("IN", True, cs_copay(1, 150, applies_ded=False),
                                       notes="Prior authorization required.")],
        "RX_GENERIC":            [tier("IN", True, cs_copay(1, 0, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_BRAND_PREF":         [tier("IN", True, cs_copay(1, 47, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_BRAND_NONPREF":      [tier("IN", True, cs_copay(1, 100, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_SPECIALTY":          [tier("IN", True, cs_coins(1, 0.33, basis="per_prescription",
                                                            applies_ded=False))],
        "OUTPATIENT_SURG_FACILITY":     [tier("IN", True, cs_copay(1, 295, applies_ded=False))],
        "OUTPATIENT_SURG_PROFESSIONAL": [tier("IN", True, cs_nocharge(),
                                              notes="Included with facility copay.")],
        "EMERGENCY_ROOM":        [tier("IN", True, cs_copay(1, 125, applies_ded=False),
                                       notes="Copay waived if admitted.")],
        "URGENT_CARE":           [tier("IN", True, cs_copay(1, 35, applies_ded=False))],
        "AMBULANCE":             [tier("IN", True, cs_copay(1, 295, basis="per_trip",
                                                            applies_ded=False))],
        "INPATIENT_HOSPITAL_FACILITY":  [tier("IN", True,
                                              cs_copay(1, 200, basis="per_day", applies_ded=False),
                                              notes="Days 1-5: $200/day; no charge thereafter."),
                                         ],
        "INPATIENT_HOSPITAL_PHYSICIAN": [tier("IN", True, cs_nocharge(),
                                              notes="Included with facility copay.")],
        "MENTAL_HEALTH_OUTPATIENT":     [tier("IN", True, cs_copay(1, 40, applies_ded=False))],
        "MENTAL_HEALTH_INPATIENT":      [tier("IN", True,
                                              cs_copay(1, 200, basis="per_day", applies_ded=False),
                                              notes="Days 1-5: $200/day; limit 190-day lifetime.")],
        "HOME_HEALTH_CARE":      [tier("IN", True, cs_nocharge())],
        "REHAB_SERVICES":        [tier("IN", True, cs_copay(1, 20, applies_ded=False))],
        "SKILLED_NURSING":       [tier("IN", True,
                                       cs_copay(1, 0, basis="per_day", applies_ded=False),
                                       notes="Days 1-20: $0; days 21-100: $200/day; limit 100 days.")],
        "DME":                   [tier("IN", True, cs_coins(1, 0.20, applies_ded=False))],
        "HOSPICE":               [tier("IN", True, cs_nocharge(),
                                       notes="Covered by Original Medicare.")],
    }


def uhc_cost_shares() -> dict[str, list[dict]]:
    """UHC Medicare Essentials HMO: IN + OON_EMERG (emergency-only OON)."""
    return {
        "PCP_VISIT":             [tier("IN", True, cs_copay(1, 0, applies_ded=False),
                                       notes="Referral required for certain specialists.")],
        "SPECIALIST_VISIT":      [tier("IN", True, cs_copay(1, 35, applies_ded=False))],
        "PREVENTIVE_CARE":       [tier("IN", True, cs_nocharge())],
        "TELEHEALTH":            [tier("IN", True, cs_copay(1, 0, applies_ded=False))],
        "DIAGNOSTIC_LAB":        [tier("IN", True, cs_copay(1, 0, basis="per_test",
                                                            applies_ded=False))],
        "IMAGING_STANDARD":      [tier("IN", True, cs_copay(1, 25, applies_ded=False))],
        "IMAGING_ADVANCED":      [tier("IN", True, cs_copay(1, 175, applies_ded=False),
                                       notes="Prior authorization required.")],
        "RX_GENERIC":            [tier("IN", True, cs_copay(1, 5, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_BRAND_PREF":         [tier("IN", True, cs_copay(1, 47, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_BRAND_NONPREF":      [tier("IN", True, cs_copay(1, 100, basis="per_prescription",
                                                            applies_ded=False))],
        "RX_SPECIALTY":          [tier("IN", True, cs_coins(1, 0.33, basis="per_prescription",
                                                            applies_ded=False))],
        "OUTPATIENT_SURG_FACILITY":     [tier("IN", True, cs_copay(1, 275, applies_ded=False))],
        "OUTPATIENT_SURG_PROFESSIONAL": [tier("IN", True, cs_nocharge())],
        "EMERGENCY_ROOM":        [tier("IN", True, cs_copay(1, 95, applies_ded=False),
                                       notes="Copay waived if admitted."),
                                  tier("OON_EMERG", True,
                                       cs_copay(1, 95, applies_ded=False, applies_moop=False),
                                       notes="Worldwide emergency; does not apply to MOOP.")],
        "URGENT_CARE":           [tier("IN", True, cs_copay(1, 35, applies_ded=False)),
                                  tier("OON_EMERG", True,
                                       cs_copay(1, 90, applies_ded=False, applies_moop=False))],
        "AMBULANCE":             [tier("IN", True, cs_copay(1, 275, basis="per_trip",
                                                            applies_ded=False))],
        "INPATIENT_HOSPITAL_FACILITY":  [tier("IN", True,
                                              cs_copay(1, 250, basis="per_day", applies_ded=False),
                                              notes="Days 1-7: $250/day; no charge thereafter.")],
        "INPATIENT_HOSPITAL_PHYSICIAN": [tier("IN", True, cs_nocharge())],
        "MENTAL_HEALTH_OUTPATIENT":     [tier("IN", True, cs_copay(1, 35, applies_ded=False))],
        "MENTAL_HEALTH_INPATIENT":      [tier("IN", True,
                                              cs_copay(1, 250, basis="per_day", applies_ded=False),
                                              notes="Days 1-7: $250/day; limit 190-day lifetime.")],
        "HOME_HEALTH_CARE":      [tier("IN", True, cs_nocharge())],
        "REHAB_SERVICES":        [tier("IN", True, cs_copay(1, 20, applies_ded=False))],
        "SKILLED_NURSING":       [tier("IN", True,
                                       cs_copay(1, 0, basis="per_day", applies_ded=False),
                                       notes="Days 1-20: $0; days 21-100: $204/day.")],
        "DME":                   [tier("IN", True, cs_coins(1, 0.20, applies_ded=False))],
        "HOSPICE":               [tier("IN", True, cs_nocharge(),
                                       notes="Covered by Original Medicare.")],
    }


# ---------------------------------------------------------------------------
# Per-carrier accumulators + plan metadata.
# ---------------------------------------------------------------------------

PLANS: dict[str, dict[str, Any]] = {
    "aetna_example.json": {
        "plan_id": "AETNA_PPO_1500_80_50",
        "plan_name": "Aetna PPO 1500 80/50 Coinsurance Plan",
        "carrier": "Aetna",
        "plan_type": "PPO",
        "plan_year": 2025,
        "effective_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "coverage_period": {"start_date": "2025-01-01", "end_date": "2025-12-31"},
        "market": "large_group",
        "network_tiers": [
            {"tier_id": "IN",  "name": "In Network",     "description": "Aetna preferred providers"},
            {"tier_id": "OUT", "name": "Out of Network", "description": "Non-contracted providers"},
        ],
        "accumulators": {
            "individual_deductible": {"amount": 1500, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "family_deductible":     {"amount": 4500, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "individual_oop_max":    {"amount": 5500, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network"},
            "family_oop_max":        {"amount": 11000, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "oon_individual_deductible": {"amount": 3000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_family_deductible":     {"amount": 9000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_individual_oop_max":    {"amount": 11000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_family_oop_max":        {"amount": 22000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
        },
        "source_references": [
            {"page_number": 1, "page_range": "L1-L150", "excerpt": "Aetna PPO 1500 80/50 SBC"}
        ],
        "cost_shares_fn": aetna_cost_shares,
    },
    "bluecross_example.json": {
        "plan_id": "BCBS_FL_PPO_505",
        "plan_name": "BlueOptions 505 with Rx $300 Rx Deductible $10/40%/50% with $35 Maternity Copay",
        "carrier": "Blue Cross",
        "plan_type": "PPO",
        "plan_year": 2025,
        "effective_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "coverage_period": {"start_date": "2025-01-01", "end_date": "2025-12-31"},
        "market": "individual_on_exchange",
        "network_tiers": [
            {"tier_id": "IN",  "name": "In Network",     "description": "Preferred providers"},
            {"tier_id": "OUT", "name": "Out of Network", "description": "Non-contracted providers"},
        ],
        "accumulators": {
            "individual_deductible": {"amount": 3500, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "family_deductible":     {"amount": 10500, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "individual_oop_max":    {"amount": 3500, "currency": "USD",
                                      "period": "per_calendar_year", "network_tier": "in-network"},
            "family_oop_max":        {"amount": 10500, "currency": "USD",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "oon_individual_deductible": {"amount": 7500, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_family_deductible":     {"amount": 22500, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_individual_oop_max":    {"amount": 15000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_family_oop_max":        {"amount": 30000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
        },
        "source_references": [
            {"page_number": 1, "page_range": "L1-L150", "excerpt": "BlueOptions 505 SBC"}
        ],
        "cost_shares_fn": bluecross_cost_shares,
    },
    "cigna_example.json": {
        "plan_id": "CIGNA_OPEN_ACCESS_PLUS_2025",
        "plan_name": "Cigna Open Access Plus",
        "carrier": "Cigna",
        "plan_type": "PPO",
        "plan_year": 2025,
        "effective_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "coverage_period": {"start_date": "2025-01-01", "end_date": "2025-12-31"},
        "market": "large_group",
        "network_tiers": [
            {"tier_id": "IN",  "name": "In Network",     "description": "Cigna OAP network"},
            {"tier_id": "OUT", "name": "Out of Network", "description": "Non-network providers"},
        ],
        "accumulators": {
            "individual_deductible": {"amount": 2500, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "family_deductible":     {"amount": 7500, "currency": "USD", "applies_to": "medical",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "individual_oop_max":    {"amount": 5000, "currency": "USD",
                                      "period": "per_calendar_year", "network_tier": "in-network"},
            "family_oop_max":        {"amount": 10000, "currency": "USD",
                                      "period": "per_calendar_year", "network_tier": "in-network",
                                      "embedded": True},
            "oon_individual_deductible": {"amount": 5000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_family_deductible":     {"amount": 15000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_individual_oop_max":    {"amount": 10000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
            "oon_family_oop_max":        {"amount": 20000, "currency": "USD",
                                          "period": "per_calendar_year",
                                          "network_tier": "out-of-network"},
        },
        "source_references": [
            {"page_number": 1, "page_range": "L1-L150", "excerpt": "Cigna Open Access Plus SBC"}
        ],
        "cost_shares_fn": cigna_cost_shares,
    },
    "gatorcare_example.json": {
        "plan_id": "GATORCARE_PRIME_PLUS_2025",
        "plan_name": "GatorCare Prime Plus",
        "carrier": "GatorCare",
        "plan_type": "PPO",
        "plan_year": 2025,
        "effective_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "coverage_period": {"start_date": "2025-01-01", "end_date": "2025-12-31"},
        "market": "large_group",
        "network_tiers": [
            {"tier_id": "IN",  "name": "In Network",     "description": "GatorCare contracted providers"},
            {"tier_id": "OUT", "name": "Out of Network", "description": "Non-contracted providers"},
        ],
        "accumulators": {
            "individual_deductible": {"amount": 2000, "currency": "USD", "applies_to": "medical",
                                      "period": "per_plan_year", "network_tier": "in-network",
                                      "embedded": True},
            "family_deductible":     {"amount": 6000, "currency": "USD", "applies_to": "medical",
                                      "period": "per_plan_year", "network_tier": "in-network",
                                      "embedded": True},
            "individual_oop_max":    {"amount": 5500, "currency": "USD",
                                      "period": "per_plan_year", "network_tier": "in-network"},
            "family_oop_max":        {"amount": 11000, "currency": "USD",
                                      "period": "per_plan_year", "network_tier": "in-network",
                                      "embedded": True},
            "oon_individual_deductible": {"amount": 4000, "currency": "USD",
                                          "period": "per_plan_year",
                                          "network_tier": "out-of-network"},
            "oon_family_deductible":     {"amount": 12000, "currency": "USD",
                                          "period": "per_plan_year",
                                          "network_tier": "out-of-network"},
            "oon_individual_oop_max":    {"amount": 11000, "currency": "USD",
                                          "period": "per_plan_year",
                                          "network_tier": "out-of-network"},
            "oon_family_oop_max":        {"amount": 22000, "currency": "USD",
                                          "period": "per_plan_year",
                                          "network_tier": "out-of-network"},
        },
        "source_references": [
            {"page_number": 1, "page_range": "L1-L150", "excerpt": "GatorCare Prime Plus SBC"}
        ],
        "cost_shares_fn": gatorcare_cost_shares,
    },
    "humana_example.json": {
        "plan_id": "HUMANA_HMO_GOLD_PLUS",
        "plan_name": "Humana Gold Plus HMO",
        "carrier": "Humana",
        "plan_type": "MA-PD",
        "plan_year": 2025,
        "effective_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "coverage_period": {"start_date": "2025-01-01", "end_date": "2025-12-31"},
        "market": "medicare_advantage",
        "network_tiers": [
            {"tier_id": "IN", "name": "In Network", "description": "Humana HMO network"},
        ],
        "accumulators": {
            "individual_oop_max": {"amount": 3000, "currency": "USD",
                                   "period": "per_calendar_year", "network_tier": "in-network",
                                   "applies_to": "medical"},
            "family_oop_max":     {"amount": 6000, "currency": "USD",
                                   "period": "per_calendar_year", "network_tier": "in-network",
                                   "applies_to": "medical"},
        },
        "source_references": [
            {"page_number": 1, "page_range": "L1-L120", "excerpt": "Humana Gold Plus EOC summary"}
        ],
        "cost_shares_fn": humana_cost_shares,
    },
    "scan_example.json": {
        "plan_id": "SCAN_CLASSIC_2025",
        "plan_name": "SCAN Classic Medicare Advantage Plan",
        "carrier": "SCAN",
        "plan_type": "MA-PD",
        "plan_year": 2025,
        "effective_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "coverage_period": {"start_date": "2025-01-01", "end_date": "2025-12-31"},
        "market": "medicare_advantage",
        "network_tiers": [
            {"tier_id": "IN", "name": "In Network", "description": "SCAN provider network"},
        ],
        "accumulators": {
            "individual_oop_max": {"amount": 3500, "currency": "USD",
                                   "period": "per_calendar_year", "network_tier": "in-network",
                                   "applies_to": "medical"},
        },
        "source_references": [
            {"page_number": 1, "page_range": "L1-L120", "excerpt": "SCAN Classic EOC summary"}
        ],
        "cost_shares_fn": scan_cost_shares,
    },
    "united_example.json": {
        "plan_id": "UHC_MEDICARE_ESSENTIALS",
        "plan_name": "UnitedHealthcare Medicare Advantage Essentials",
        "carrier": "UnitedHealthcare",
        "plan_type": "MA-PD",
        "plan_year": 2025,
        "effective_date": "2025-01-01",
        "expiry_date": "2025-12-31",
        "coverage_period": {"start_date": "2025-01-01", "end_date": "2025-12-31"},
        "market": "medicare_advantage",
        "network_tiers": [
            {"tier_id": "IN",        "name": "In Network",
             "description": "Provider network"},
            {"tier_id": "OON_EMERG", "name": "Out of Network Emergency",
             "description": "Emergency or urgent care outside the network"},
        ],
        "accumulators": {
            "individual_oop_max": {"amount": 2900, "currency": "USD",
                                   "period": "per_calendar_year", "network_tier": "in-network",
                                   "applies_to": "medical"},
        },
        "source_references": [
            {"page_number": 1, "page_range": "L1-L120", "excerpt": "UHC Medicare Essentials EOC summary"}
        ],
        "cost_shares_fn": uhc_cost_shares,
    },
}


# ---------------------------------------------------------------------------
# Builder
# ---------------------------------------------------------------------------

def build_plan(filename: str, spec: dict[str, Any]) -> dict[str, Any]:
    cost_shares_fn = spec["cost_shares_fn"]
    cs_map = cost_shares_fn()

    benefits: list[dict[str, Any]] = []
    for entry in CATALOG:
        if entry["benefit_id"] not in cs_map:
            continue
        ncs = cs_map[entry["benefit_id"]]
        b = {
            "benefit_id":           entry["benefit_id"],
            "benefit_type":         entry["benefit_type"],
            "category":             entry["category"],
            "service_name":         entry["service_name"],
            "canonical_key":        entry["canonical_key"],
            "place_of_service":     entry["place_of_service"],
            "network_cost_shares":  ncs,
            "limits":               [],
            "conditions":           [],
            "moop_applicability":   "plan_default",
        }
        benefits.append(b)

    plan = {
        "plan_id":          spec["plan_id"],
        "plan_name":        spec["plan_name"],
        "carrier":          spec["carrier"],
        "plan_type":        spec["plan_type"],
        "plan_year":        spec["plan_year"],
        "effective_date":   spec["effective_date"],
        "expiry_date":      spec["expiry_date"],
        "coverage_period":  spec["coverage_period"],
        "market":           spec["market"],
        "network_tiers":    spec["network_tiers"],
        "accumulators":     spec["accumulators"],
        "benefits":         benefits,
        "source_references": spec["source_references"],
        "schema_version":   "1.1.0",
    }
    return plan


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    examples_dir = root / "examples"
    for filename, spec in PLANS.items():
        plan = build_plan(filename, spec)
        out = examples_dir / filename
        out.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {out.relative_to(root)} ({len(plan['benefits'])} benefits)")


if __name__ == "__main__":
    main()
