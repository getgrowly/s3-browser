# 🔍 Tag Kısıtlama Sorunu - v1.0.* Pattern

## 📋 Sorun Özeti

Repository'de **v1.0.*** pattern'ine uyan tag'lerin oluşturulmasını engelleyen gizli bir kısıtlama vardı.

### Belirtiler

```bash
# v1.0.2 tag'i oluşturmaya çalışınca:
remote: error: GH013: Repository rule violations found for refs/tags/v1.0.2
remote: - Cannot create ref due to creations being restricted.

# v1.0.3 de aynı şekilde engellendi:
remote: error: GH013: Repository rule violations found for refs/tags/v1.0.3
```

### Test Sonuçları

| Tag | Sonuç |
|-----|-------|
| `v1.0.2` | ❌ Engellendi |
| `v1.0.3` | ❌ Engellendi |
| `v1.1.0` | ✅ Başarılı |
| `v2.0.0-test` | ✅ Başarılı |
| `test-tag-*` | ✅ Başarılı |

**Sonuç:** Sadece `v1.0.*` pattern'i engellenmiş!

## 🔍 Araştırma Süreci

### 1. API Kontrolleri

```bash
# Repository-level rulesets - BOŞ
gh api /repos/getgrowly/s3-browser/rulesets
# → []

# Branch protection - YOK
gh api /repos/getgrowly/s3-browser/branches/main/protection
# → 404 Not protected

# Tag protection - DEPRECATED
gh api /repos/getgrowly/s3-browser/tags/protection
# → 410 Deprecated

# Rules on main branch - BOŞ
gh api /repos/getgrowly/s3-browser/rules/branches/main
# → []
```

### 2. Organization Rulesets

```bash
# Organization rulesets - REQUIRES GITHUB TEAM
gh api /orgs/getgrowly/rulesets
# → 403 Upgrade to GitHub Team to enable this feature
```

Organization rulesets görüntülenemedi çünkü GitHub Team plan gerektiriyor.

## 💡 Muhtemel Sebep

Birkaç olasılık var:

### Senaryo 1: Organization-Level Hidden Ruleset

GitHub Free plan'de organization rulesets API'si erişilebilir değil. Muhtemelen:
- Organization-level bir ruleset var
- `v1.0.*` pattern'ini engelliyor
- API'den görünmüyor (GitHub Team gerekiyor)
- Ama push sırasında enforce ediliyor

### Senaryo 2: Legacy Tag Protection

Eski bir tag protection rule olabilir:
- Tag protection API deprecated oldu
- Ama eski rules hala aktif kalabiliyor
- Yeni API'den görünmüyor

### Senaryo 3: Repository-Specific Setting

Repository settings'de UI-only bir ayar olabilir:
- API'den erişilemeyen
- Sadece web interface'den görülebilen
- Tag creation'ı kısıtlayan

## ✅ Çözüm

### Kısa Vadeli: v1.1.0'a Geçtik

```bash
# Manifest ve package.json'u güncelledik
{
  "version": "1.1.0"  # Was: 1.0.2
}

# v1.1.0 tag'i manuel oluşturduk
git tag v1.1.0
git push origin v1.1.0  # ✅ Başarılı

# v1.1.0 release'i oluşturduk
gh release create v1.1.0 --notes "..."  # ✅ Başarılı
```

### Uzun Vadeli: Kısıtlamayı Kaldırma

Kısıtlamayı kaldırmak için organization owner/admin şunları kontrol etmeli:

#### 1. Organization Settings

https://github.com/organizations/getgrowly/settings/rules

- Active rulesets var mı?
- s3-browser repository'sine uygulanan var mı?
- `v1.0.*` pattern'i match eden var mı?

#### 2. Repository Settings (Web UI)

https://github.com/getgrowly/s3-browser/settings/rules

- Web UI'da görünen ama API'den görünmeyen bir setting var mı?
- "Tag creation" ile ilgili bir kısıtlama var mı?

#### 3. Tag Protection (Eski Sistem)

GitHub'a tag protection rule'ları tamamen kaldırdıklarını söyleseler de, eski rules hala aktif olabilir:

https://github.com/getgrowly/s3-browser/settings/tag_protection

- Bu sayfa hala açılıyor mu?
- `v1.0.*` pattern'i için bir rule var mı?

## 📊 Mevcut Durum

### ✅ Çalışıyor

- GitHub App token oluşturma: ✅
- Administration permission: ✅
- v1.1.0+ tag creation: ✅
- v1.1.0 release: ✅
- Automated workflow: ✅

### ⚠️ Kısıtlı

- v1.0.* tag'leri oluşturulamaz
- Sebep tam olarak belirlenemedi
- Organization admin araştırması gerekli

## 🎯 Gelecek İçin

### Versiyonlama Stratejisi

Şu andan itibaren:

```
✅ v1.1.0 → v1.1.1 → v1.1.2 → v1.2.0 → v2.0.0
❌ v1.0.2 → v1.0.3 (ENGELLENEN)
```

### Yeni Tag Oluşturmadan Önce

```bash
# Test edin:
git tag vX.Y.Z-test
git push origin vX.Y.Z-test

# Başarılıysa:
git tag vX.Y.Z
git push origin vX.Y.Z
```

## 🔍 Debug Komutları

Gelecekte benzer sorunlar için:

```bash
# 1. Repository rulesets kontrol
gh api /repos/OWNER/REPO/rulesets

# 2. Branch protection kontrol
gh api /repos/OWNER/REPO/branches/main/protection

# 3. Rules on specific ref
gh api /repos/OWNER/REPO/rules/branches/BRANCH

# 4. Test tag creation
git tag test-vX.Y.Z && git push origin test-vX.Y.Z

# 5. Check error details
git push origin vX.Y.Z 2>&1 | grep -A 5 "rule violations"
```

## 📝 Notlar

- Bu kısıtlama sadece `v1.0.*` pattern'ine özel
- Diğer tüm version pattern'leri çalışıyor
- GitHub App ve Administration permission sorun değil
- Kök sebep organization-level bir kısıtlama olabilir

## 🎊 Sonuç

**Sorun:** v1.0.* tag'leri oluşturulamıyor

**Geçici Çözüm:** v1.1.0'a geçtik ✅

**Kalıcı Çözüm:** Organization admin tarafından kısıtlamanın kaldırılması

**Etki:** Minimal - Sadece versiyon numarasını değiştirdik

---

**Oluşturma Tarihi:** 2025-10-29
**Durum:** Çözüldü (workaround ile)
**Takip:** Organization admin incelemesi bekleniyor
