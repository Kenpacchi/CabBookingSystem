import React, { useState, useRef, useEffect } from 'react'

// ── Country list (dial code + flag + name + digit rules) ──────────────────────
const COUNTRIES = [
  { code: 'IN', dialCode: '+91',  flag: '🇮🇳', name: 'India',          digits: 10, pattern: /^[6-9]\d{9}$/ },
  { code: 'US', dialCode: '+1',   flag: '🇺🇸', name: 'United States',  digits: 10, pattern: /^\d{10}$/ },
  { code: 'GB', dialCode: '+44',  flag: '🇬🇧', name: 'United Kingdom', digits: 10, pattern: /^\d{10}$/ },
  { code: 'AE', dialCode: '+971', flag: '🇦🇪', name: 'UAE',            digits: 9,  pattern: /^\d{9}$/ },
  { code: 'SG', dialCode: '+65',  flag: '🇸🇬', name: 'Singapore',      digits: 8,  pattern: /^\d{8}$/ },
  { code: 'AU', dialCode: '+61',  flag: '🇦🇺', name: 'Australia',      digits: 9,  pattern: /^\d{9}$/ },
  { code: 'CA', dialCode: '+1',   flag: '🇨🇦', name: 'Canada',         digits: 10, pattern: /^\d{10}$/ },
  { code: 'DE', dialCode: '+49',  flag: '🇩🇪', name: 'Germany',        digits: 10, pattern: /^\d{10,11}$/ },
  { code: 'FR', dialCode: '+33',  flag: '🇫🇷', name: 'France',         digits: 9,  pattern: /^\d{9}$/ },
  { code: 'JP', dialCode: '+81',  flag: '🇯🇵', name: 'Japan',          digits: 10, pattern: /^\d{10,11}$/ },
  { code: 'NP', dialCode: '+977', flag: '🇳🇵', name: 'Nepal',          digits: 10, pattern: /^\d{10}$/ },
  { code: 'BD', dialCode: '+880', flag: '🇧🇩', name: 'Bangladesh',     digits: 10, pattern: /^\d{10}$/ },
  { code: 'PK', dialCode: '+92',  flag: '🇵🇰', name: 'Pakistan',       digits: 10, pattern: /^\d{10}$/ },
  { code: 'LK', dialCode: '+94',  flag: '🇱🇰', name: 'Sri Lanka',      digits: 9,  pattern: /^\d{9}$/ },
]

// Indian number validation: must start with 6-9, exactly 10 digits
function validateIndianNumber(digits) {
  return /^[6-9]\d{9}$/.test(digits)
}

function validateNumber(digits, country) {
  if (!digits) return null // no error yet if empty
  if (country.code === 'IN') {
    if (digits.length < 10) return `Phone must be exactly 10 digits`
    if (digits.length === 10 && !/^[6-9]/.test(digits))
      return 'Indian numbers must start with 6, 7, 8, or 9'
    if (!country.pattern.test(digits)) return `Enter a valid ${country.digits}-digit Indian mobile number`
  } else {
    if (digits.length < country.digits)
      return `Phone must be exactly ${country.digits} digits`
    if (!country.pattern.test(digits))
      return `Enter a valid ${country.digits}-digit number`
  }
  return null
}

/**
 * PhoneInput — reusable phone number field with country code selector.
 *
 * Props:
 *   value        {string}   raw digits only (no dial code), controlled
 *   onChange     {fn}       called with (digits, dialCode, countryCode, isValid)
 *   disabled     {boolean}
 *   autoFocus    {boolean}
 *   placeholder  {string}   overrides default
 *   showError    {boolean}  show validation error messages (default true)
 *   theme        {object}   optional style overrides: { input, wrapper, dropdown }
 *   variant      {string}   'dark' (default) | 'light' — controls color scheme
 */
export default function PhoneInput({
  value = '',
  onChange,
  disabled = false,
  autoFocus = false,
  placeholder,
  showError = true,
  theme = {},
  variant = 'dark',
}) {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]) // default India
  const [dropdownOpen, setDropdownOpen]       = useState(false)
  const [searchQuery, setSearchQuery]         = useState('')
  const [touched, setTouched]                 = useState(false)
  const [focused, setFocused]                 = useState(false)
  const dropdownRef = useRef(null)
  const searchRef   = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) searchRef.current.focus()
  }, [dropdownOpen])

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.dialCode.includes(searchQuery) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const validationError = touched ? validateNumber(value, selectedCountry) : null
  const isValid = validateNumber(value, selectedCountry) === null && value.length > 0

  const handleDigitChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '') // digits only
    const capped = raw.slice(0, selectedCountry.digits)
    const error = validateNumber(capped, selectedCountry)
    onChange?.(capped, selectedCountry.dialCode, selectedCountry.code, error === null && capped.length > 0)
  }

  const handleCountrySelect = (country) => {
    setSelectedCountry(country)
    setDropdownOpen(false)
    setSearchQuery('')
    // re-validate current value against new country
    const error = validateNumber(value, country)
    onChange?.(value, country.dialCode, country.code, error === null && value.length > 0)
  }

  const defaultPlaceholder =
    selectedCountry.code === 'IN' ? '9876543210' : '0'.repeat(selectedCountry.digits)

  const isLight = variant === 'light'

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = isLight
    ? // ── LIGHT variant styles ──────────────────────────────────────────────
      {
        wrapper: {
          position: 'relative',
          ...theme.wrapper,
        },
        row: {
          display: 'flex',
          gap: 0,
          alignItems: 'stretch',
        },
        flagBtn: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          background: 'white',
          border: `1.5px solid ${focused ? '#F59E0B' : '#E2E8F0'}`,
          borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: '#1A202C',
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'border-color 0.18s',
          minWidth: 82,
          ...(focused ? { boxShadow: '0 0 0 3px rgba(245,158,11,0.15)' } : {}),
        },
        dialCode: {
          fontSize: 13,
          color: '#D97706',
          fontWeight: 700,
        },
        chevron: {
          fontSize: 10,
          color: '#718096',
          marginLeft: 2,
        },
        input: {
          flex: 1,
          padding: '13px 15px',
          background: 'white',
          border: `1.5px solid ${
            validationError ? '#DC2626'
            : focused        ? '#F59E0B'
            : isValid        ? '#059669'
            : '#E2E8F0'
          }`,
          borderLeft: `1.5px solid ${
            validationError ? '#DC2626'
            : focused        ? '#F59E0B'
            : isValid        ? '#059669'
            : '#E2E8F0'
          }`,
          borderRadius: '0 12px 12px 0',
          color: '#1A202C',
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          letterSpacing: '0.5px',
          ...(focused ? { boxShadow: '0 0 0 3px rgba(245,158,11,0.15)' } : {}),
          ...theme.input,
        },
        statusIcon: {
          position: 'absolute',
          right: 13,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 16,
          pointerEvents: 'none',
        },
        errorText: {
          marginTop: 5,
          fontSize: 12,
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        },
        hintText: {
          marginTop: 5,
          fontSize: 12,
          color: '#718096',
        },
        dropdownContainer: {
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 1000,
          background: 'white',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          width: 280,
          ...theme.dropdown,
        },
        searchInput: {
          width: '100%',
          padding: '10px 14px',
          background: '#F5F7FA',
          border: 'none',
          borderBottom: '1px solid #E2E8F0',
          color: '#1A202C',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        },
        countryList: {
          maxHeight: 220,
          overflowY: 'auto',
        },
        countryItem: (isSelected) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          cursor: 'pointer',
          background: isSelected ? '#FEF3C7' : 'transparent',
          borderLeft: isSelected ? '3px solid #F59E0B' : '3px solid transparent',
          transition: 'background 0.12s',
          fontSize: 13,
          color: isSelected ? '#D97706' : '#1A202C',
        }),
      }
    : // ── DARK variant styles (original) ──────────────────────────────────
      {
        wrapper: {
          position: 'relative',
          ...theme.wrapper,
        },
        row: {
          display: 'flex',
          gap: 0,
          alignItems: 'stretch',
        },
        flagBtn: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${focused ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
          borderRight: 'none',
          borderRadius: '12px 0 0 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'rgba(255,255,255,0.75)',
          fontSize: 14,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'border-color 0.18s',
          minWidth: 82,
          ...(focused ? { boxShadow: '0 0 0 3px rgba(255,214,0,0.15)' } : {}),
        },
        dialCode: {
          fontSize: 13,
          color: '#FFD700',
          fontWeight: 700,
        },
        chevron: {
          fontSize: 10,
          color: 'rgba(255,255,255,0.4)',
          marginLeft: 2,
        },
        input: {
          flex: 1,
          padding: '13px 15px',
          background: 'rgba(255,255,255,0.06)',
          border: `1.5px solid ${
            validationError ? '#FF5252'
            : focused        ? '#FFD700'
            : isValid        ? '#22c55e'
            : 'rgba(255,255,255,0.1)'
          }`,
          borderLeft: `1.5px solid ${
            validationError ? '#FF5252'
            : focused        ? '#FFD700'
            : isValid        ? '#22c55e'
            : 'rgba(255,255,255,0.08)'
          }`,
          borderRadius: '0 12px 12px 0',
          color: 'white',
          fontSize: 15,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.18s, box-shadow 0.18s',
          letterSpacing: '0.5px',
          ...(focused ? { boxShadow: '0 0 0 3px rgba(255,214,0,0.15)' } : {}),
          ...theme.input,
        },
        statusIcon: {
          position: 'absolute',
          right: 13,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 16,
          pointerEvents: 'none',
        },
        errorText: {
          marginTop: 5,
          fontSize: 12,
          color: '#FF5252',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        },
        hintText: {
          marginTop: 5,
          fontSize: 12,
          color: 'rgba(255,255,255,0.35)',
        },
        dropdownContainer: {
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 1000,
          background: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          width: 280,
          ...theme.dropdown,
        },
        searchInput: {
          width: '100%',
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          color: 'white',
          fontSize: 13,
          outline: 'none',
          boxSizing: 'border-box',
        },
        countryList: {
          maxHeight: 220,
          overflowY: 'auto',
        },
        countryItem: (isSelected) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          cursor: 'pointer',
          background: isSelected ? 'rgba(255,214,0,0.08)' : 'transparent',
          borderLeft: isSelected ? '3px solid #FFD700' : '3px solid transparent',
          transition: 'background 0.12s',
          fontSize: 13,
          color: isSelected ? '#FFD700' : 'rgba(255,255,255,0.8)',
        }),
      }

  // Country code label colors per variant
  const countryCodeColor   = isLight ? '#374151' : 'rgba(255,255,255,0.6)'
  const dialCodeInListColor = isLight ? '#D97706' : '#FFD700'
  const digitCountColor     = isLight ? '#A0AEC0' : 'rgba(255,255,255,0.3)'
  const noResultsColor      = isLight ? '#718096' : 'rgba(255,255,255,0.4)'
  const hoverBg             = isLight ? '#F5F7FA' : 'rgba(255,255,255,0.06)'

  return (
    <div style={styles.wrapper} ref={dropdownRef}>
      <div style={styles.row}>
        {/* Country code button */}
        <button
          type="button"
          style={styles.flagBtn}
          onClick={() => !disabled && setDropdownOpen(v => !v)}
          aria-label="Select country code"
          aria-expanded={dropdownOpen}
          disabled={disabled}
        >
          <span style={{ fontSize: 20 }}>{selectedCountry.flag}</span>
          <span style={styles.dialCode}>{selectedCountry.dialCode}</span>
          <span style={styles.chevron}>{dropdownOpen ? '▲' : '▼'}</span>
        </button>

        {/* Number input */}
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="tel"
            inputMode="numeric"
            placeholder={placeholder ?? defaultPlaceholder}
            value={value}
            onChange={handleDigitChange}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); setTouched(true) }}
            maxLength={selectedCountry.digits}
            disabled={disabled}
            autoFocus={autoFocus}
            style={styles.input}
            aria-invalid={!!validationError}
            aria-describedby="phone-error"
          />
          {/* Inline status icon */}
          {value.length > 0 && (
            <span style={styles.statusIcon}>
              {isValid ? '✅' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Validation error */}
      {showError && validationError && (
        <div style={styles.errorText} id="phone-error" role="alert">
          <span>⚠️</span> {validationError}
        </div>
      )}

      {/* Hint for Indian numbers */}
      {showError && !validationError && selectedCountry.code === 'IN' && value.length === 0 && (
        <div style={styles.hintText}>
          10-digit mobile number starting with 6, 7, 8, or 9
        </div>
      )}

      {/* Country dropdown */}
      {dropdownOpen && (
        <div style={styles.dropdownContainer}>
          <input
            ref={searchRef}
            type="text"
            placeholder="🔍  Search country..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.countryList}>
            {filteredCountries.length === 0 ? (
              <div style={{ padding: '12px 16px', color: noResultsColor, fontSize: 13 }}>
                No results
              </div>
            ) : filteredCountries.map(c => (
              <div
                key={c.code}
                style={styles.countryItem(c.code === selectedCountry.code)}
                onClick={() => handleCountrySelect(c)}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background =
                  c.code === selectedCountry.code
                    ? (isLight ? '#FEF3C7' : 'rgba(255,214,0,0.08)')
                    : 'transparent'}
                role="option"
                aria-selected={c.code === selectedCountry.code}
              >
                <span style={{ fontSize: 20 }}>{c.flag}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ color: dialCodeInListColor, fontWeight: 700, fontSize: 12 }}>{c.dialCode}</span>
                <span style={{ color: digitCountColor, fontSize: 11 }}>{c.digits}d</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
