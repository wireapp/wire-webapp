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
{{- if .Values.appendReleaseNameToResources }}
{{- printf "webapp-%s" .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else }}
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
  {{- if or .Values.ingress.enabled .Values.tls.enabled }}
    {{- if not .Values.webappDomain }}
      {{- fail "webappDomain must be set when enabling ingress or tls" }}
    {{- end }}
  {{- end }}
  {{- if and .Values.tls.enabled (not .Values.ingress.enabled) }}
    {{- fail "ingress.enabled must be true when tls.enabled is true" }}
  {{- end }}
  {{- if and .Values.tls.enabled (not .Values.tls.useCertManager) (empty .Values.tls.existingSecretName) }}
    {{- fail "When tls.enabled is true, either tls.useCertManager must be true or tls.existingSecretName must be set" }}
  {{- end }}
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
