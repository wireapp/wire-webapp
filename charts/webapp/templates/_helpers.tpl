{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "webapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Base resource name. Keep legacy "webapp" naming by default, optionally append
the release name to allow multiple installations in the same namespace.
*/}}
{{- define "webapp.baseName" -}}
{{- if .Values.appendReleaseNameToResources -}}
{{- printf "webapp-%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
webapp
{{- end -}}
{{- end -}}

{{- define "webapp.httpServiceName" -}}
{{- printf "%s-http" (include "webapp.baseName" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "webapp.fullname" -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Allow KubeVersion to be overridden. */}}
{{- define "kubeVersion" -}}
  {{- default .Capabilities.KubeVersion.Version .Values.kubeVersionOverride -}}
{{- end -}}

{{- define "includeSecurityContext" -}}
  {{- (semverCompare ">= 1.24-0" (include "kubeVersion" .)) -}}
{{- end -}}

{{- define "webapp.validateDomainConfig" -}}
  {{- $routingMode := default "nginx" .Values.routing.mode | lower -}}
  {{- $routingEnabled := eq (include "webapp.routingEnabled" . | trim) "true" -}}
  {{- if or $routingEnabled .Values.tls.enabled }}
    {{- if not .Values.webappDomain }}
      {{- fail "webappDomain must be set when enabling routing or tls" }}
    {{- end }}
  {{- end }}
  {{- if and (ne $routingMode "nginx") (ne $routingMode "envoy") (ne $routingMode "migration") }}
    {{- fail "routing.mode must be one of nginx, envoy, or migration" }}
  {{- end }}
  {{- if and (or (eq $routingMode "envoy") (eq $routingMode "migration")) (not $routingEnabled) }}
    {{- fail "routing.enabled must be true when routing.mode is envoy or migration" }}
  {{- end }}
  {{- if and $routingEnabled (or (eq $routingMode "envoy") (eq $routingMode "migration")) (empty .Values.gateway.name) }}
    {{- fail "gateway.name must be set when routing.mode is envoy or migration" }}
  {{- end }}
  {{- if and $routingEnabled (eq $routingMode "migration") (and (ne (default "nginx" .Values.routing.migration.primary | lower) "nginx") (ne (default "nginx" .Values.routing.migration.primary | lower) "envoy")) }}
    {{- fail "routing.migration.primary must be one of nginx or envoy" }}
  {{- end }}
  {{- if and .Values.ingress.renderCSPInIngress (eq $routingMode "envoy") }}
    {{- fail "ingress.renderCSPInIngress only works with routing.mode=nginx or migration" }}
  {{- end }}
  {{- if and .Values.tls.enabled (not $routingEnabled) }}
    {{- fail "routing.enabled must be true when tls.enabled is true" }}
  {{- end }}
  {{- if and .Values.tls.enabled (not .Values.tls.useCertManager) (empty .Values.tls.existingSecretName) }}
    {{- fail "When tls.enabled is true, either tls.useCertManager must be true or tls.existingSecretName must be set" }}
  {{- end }}
{{- end -}}

{{- define "webapp.routingEnabled" -}}
{{- or .Values.routing.enabled .Values.ingress.enabled -}}
{{- end -}}

{{- define "webapp.routingMode" -}}
{{- default "nginx" .Values.routing.mode | lower -}}
{{- end -}}

{{- define "webapp.routingPrimaryController" -}}
{{- $mode := include "webapp.routingMode" . -}}
{{- if eq $mode "migration" -}}
{{- default "nginx" .Values.routing.migration.primary | lower -}}
{{- else -}}
{{- $mode -}}
{{- end -}}
{{- end -}}

{{- define "webapp.externalDnsWeight" -}}
{{- $ctx := .ctx -}}
{{- $kind := .kind -}}
{{- if eq (include "webapp.routingMode" $ctx) "migration" -}}
{{- if eq (include "webapp.routingPrimaryController" $ctx) $kind -}}
100
{{- else -}}
0
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "webapp.externalDnsSetIdentifier" -}}
{{- $ctx := .ctx -}}
{{- $kind := .kind -}}
{{- if eq (include "webapp.routingMode" $ctx) "migration" -}}
{{- printf "%s-%s" (include "webapp.baseName" $ctx) $kind -}}
{{- end -}}
{{- end -}}

{{- define "webapp.listenerSetName" -}}
{{- printf "%s-listeners" (include "webapp.baseName" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "webapp.listenerName" -}}
{{- if .Values.gateway.sectionName -}}
{{- .Values.gateway.sectionName -}}
{{- else if .Values.tls.enabled -}}
https
{{- else -}}
http
{{- end -}}
{{- end -}}

{{- define "webapp.listenerProtocol" -}}
{{- if .Values.tls.enabled -}}
HTTPS
{{- else -}}
HTTP
{{- end -}}
{{- end -}}

{{- define "webapp.listenerPort" -}}
{{- if .Values.tls.enabled -}}
443
{{- else -}}
80
{{- end -}}
{{- end -}}

{{- define "webapp.certificateSecretName" -}}
{{- printf "%s-managed-tls-certificate" (include "webapp.fullname" .) -}}
{{- end -}}

{{- define "webapp.tlsSecretName" -}}
{{- if .Values.tls.existingSecretName -}}
{{- .Values.tls.existingSecretName -}}
{{- else -}}
{{- include "webapp.certificateSecretName" . -}}
{{- end -}}
{{- end -}}

{{- define "webapp.issuerName" -}}
{{- printf "%s-%s" (include "webapp.fullname" .) .Values.tls.issuer.name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Returns the Letsencrypt API server URL based on whether testMode is enabled or disabled */}}
{{- define "webapp.certManager.apiServerURL" -}}
{{- $hostnameParts := list "acme" -}}
{{- if .Values.certManager.inTestMode -}}
    {{- $hostnameParts = append $hostnameParts "staging" -}}
{{- end -}}
{{- $hostnameParts = append $hostnameParts "v02" -}}
{{- join "-" $hostnameParts | printf "https://%s.api.letsencrypt.org/directory" -}}
{{- end -}}
