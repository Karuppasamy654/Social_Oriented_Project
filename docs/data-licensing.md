# CodeBuddy Data Licensing & Legal Safety Policy

## 1. Zero Direct Web Scraping Policy
CodeBuddy enforces a strict architectural policy prohibiting live web scraping of third-party platforms including `leetcode.com`. The platform does not use web crawlers, BeautifulSoup, Selenium, or Playwright to make HTTP requests against external competitive programming websites.

## 2. Integrated Dataset Provenance & Terms
All coding problems, difficulty metadata, topic tags, and test cases hosted in CodeBuddy's production MongoDB database are derived exclusively from independently published open-source research datasets.

### Primary Problem Dataset
- **Name**: LeetCodeDataset
- **Repository**: [https://github.com/newfacade/LeetCodeDataset](https://github.com/newfacade/LeetCodeDataset)
- **Publisher**: newfacade
- **License**: Apache License 2.0
- **Allowed Use**: Reproduction, redistribution, modification, and commercial/production deployment with copyright notice and license preservation.
- **Redistribution Terms**: Covered by Apache 2.0 terms. Attribution is maintained in system documentation and problem metadata headers (`sourceMetadata`).

## 3. Allowed vs Excluded Content Fields
| Field Category | Included / Permitted | Reason |
| :--- | :--- | :--- |
| Problem Title & Description | Yes | Open research corpus under Apache 2.0 |
| Difficulty & Topic Tags | Yes | Public domain algorithmic metadata |
| Starter Code (C++, JS, Python) | Yes | Open template code |
| Sample & Hidden Test Cases | Yes | Validated for open execution testing |
| Private User Submissions | No | Excluded from external dataset |
| Web Scraping Session Tokens | No | Excluded from external dataset |

## 4. Security & Content Sanitization
All imported HTML and Markdown problem descriptions are sanitized prior to rendering in the CodeBuddy client interface to prevent XSS attacks, inline script injection, or malicious payload execution.
