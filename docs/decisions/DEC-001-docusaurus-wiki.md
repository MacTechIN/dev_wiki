---
title: DEC-001 Docusaurus 기반 Dev Wiki 채택
description: 사내 개발팀 Wiki 프레임워크로 Docusaurus를 채택한 결정 기록
---

# DEC-001: Docusaurus 기반 Dev Wiki 채택

## 상태

Accepted

## 배경

사내 개발팀은 개발 지식, 운영 절차, API 문서, 의사결정 기록을 지속적으로 정리할 문서 포털이 필요합니다.

## 결정

Docusaurus v3 기반 정적 문서 사이트를 Dev Wiki의 기본 프레임워크로 채택합니다.

## 이유

- Markdown/MDX 기반이라 문서 작성이 쉽습니다.
- 사이드바, 검색, 목차, sitemap 등 Wiki형 문서 기능을 제공합니다.
- React 기반 확장이 가능합니다.
- 정적 배포라 운영 부담이 낮습니다.
- Git 기반 리뷰 프로세스와 잘 맞습니다.

## 결과

초기 배포 경로는 `/wiki/`로 고정하고, 문서가 증가하면 검색과 권한 체계를 단계적으로 확장합니다.
