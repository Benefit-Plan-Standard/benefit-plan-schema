# Adopters

An adopter of the Benefit Plan Standard reads or writes the schema in its own production software, and a validation run of what that software reads or writes is the evidence. Under the release rule in [`docs/governance.md`](docs/governance.md) (Releases), 2 independent adopters take a draft to release, and this file is the record of them. Contributing code to the Benefit Plan Standard is a separate role; see [`CONTRIBUTING.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-docs/blob/main/CONTRIBUTING.md) in the documentation repository. To be listed, open an [issue](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/issues) or a pull request with the evidence: what the software reads or writes, the version or draft it validates against, and the validation run. The maintainer records in each entry whether the adopter is independent of the maintainer.

## RxCare

- **Who:** RxCare (rxcare.ai), for AidenRx and its broker tools.
- **What it does with the schema:** reads the CMS monthly Part D formulary file into the shape of the pharmacy module v0.2.1, for 2027 Medicare Part D plans.
- **Adopted:** the Benefit Plan Standard 1.2.0 draft, at draft 5, with the pharmacy module v0.2.1.
- **Evidence:** a validation run of Humana Gold Plus Giveback H1036-305 for 2027 against the pharmacy module v0.2.1 schema, October 2026.
- **Listed:** at the request of RxCare, October 23, 2026.
- **Independence:** no relationship to the maintainer other than the CMS Real-Time Benefits workgroup.
