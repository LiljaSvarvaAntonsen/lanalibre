import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import { radii } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../constants/spacing';
import { fonts, fontSizes } from '../../constants/typography';
import { PALETTE, isLight } from '../../constants/palette';

const DEFAULT_COLOR = '#C8BBE8';

// ── ColorPickerPanel ──────────────────────────────────────────────────────────

export default function ColorPickerPanel({ visible, recentColors, onActivate, onDismiss }) {
  const { theme: colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(1);
  const [selectedHex, setSelectedHex] = useState(DEFAULT_COLOR);
  const [brushWidth, setBrushWidth] = useState(8);

  if (!visible) return null;

  function handleActivate() {
    onActivate({ color: selectedHex, width: brushWidth });
    setStep(1);
  }

  if (step === 2) {
    return (
      <View style={s.panel}>
        <View style={[s.colorPreview, { backgroundColor: selectedHex }]} />

        <Text style={s.grosorLabel}>Grosor del pincel</Text>
        <Slider
          style={s.slider}
          minimumValue={1}
          maximumValue={20}
          step={1}
          value={brushWidth}
          onValueChange={setBrushWidth}
          minimumTrackTintColor={colors.primary.DEFAULT}
          maximumTrackTintColor={colors.neutral.greige}
          thumbTintColor={colors.primary.DEFAULT}
        />
        <Text style={s.sliderLabel}>{brushWidth}px</Text>

        <TouchableOpacity style={s.activateBtn} onPress={handleActivate} activeOpacity={0.85}>
          <Text style={s.activateBtnText}>Activar pincel</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setStep(1)} style={s.backLink}>
          <Text style={s.backLinkText}>Atrás</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.panel}>
      <Text style={s.title}>Personaliza tu color</Text>

      {recentColors.length > 0 && (
        <View style={s.section}>
          <Text style={s.groupHeader}>Recientes</Text>
          <View style={s.swatchRow}>
            {recentColors.map((hex) => (
              <TouchableOpacity
                key={`recent-${hex}`}
                accessibilityLabel={hex}
                style={[
                  s.swatch,
                  { backgroundColor: hex },
                  isLight(hex) && s.swatchLight,
                  selectedHex === hex && s.swatchSelected,
                ]}
                onPress={() => setSelectedHex(hex)}
                activeOpacity={0.8}
              />
            ))}
          </View>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {PALETTE.map(({ group, swatches }) => (
          <View key={group} style={s.section}>
            <Text style={s.groupHeader}>{group}</Text>
            <View style={s.swatchRow}>
              {swatches.map(({ name, hex }) => (
                <TouchableOpacity
                  key={hex}
                  accessibilityLabel={name}
                  style={[
                    s.swatch,
                    { backgroundColor: hex },
                    isLight(hex) && s.swatchLight,
                    selectedHex === hex && s.swatchSelected,
                  ]}
                  onPress={() => setSelectedHex(hex)}
                  activeOpacity={0.8}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(2)} activeOpacity={0.85}>
        <Text style={s.primaryBtnText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors) { return StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    maxHeight: 440,
    backgroundColor: colors.card,
    borderRadius: radii.modal,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 50,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  scroll: {
    maxHeight: 270,
  },
  section: {
    marginBottom: spacing.sm,
  },
  groupHeader: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  swatchLight: {
    borderWidth: 1,
    borderColor: colors.neutral.greige,
  },
  swatchSelected: {
    borderWidth: 2.5,
    borderColor: colors.primary.DEFAULT,
  },
  primaryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary.dark,
    borderRadius: radii.small,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },

  // Step 2
  colorPreview: {
    height: 60,
    borderRadius: radii.small,
    marginBottom: spacing.md,
  },
  grosorLabel: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabel: {
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  activateBtn: {
    backgroundColor: colors.secondary.cinnamon,
    borderRadius: radii.small,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activateBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: fontSizes.md,
    color: colors.card,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  backLinkText: {
    fontFamily: fonts.regular,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
}); }
