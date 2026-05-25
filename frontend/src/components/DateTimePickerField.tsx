import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { radius, font, spacing } from '@/src/theme';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  placeholder?: string;
  testID?: string;
};

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromISO(s: string): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function displayDate(s: string): string {
  if (!s) return '';
  const d = fromISO(s);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function DatePickerField({ value, onChange, placeholder = 'Selecionar data', testID }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [show, setShow] = useState(false);

  // Web: native HTML date input
  if (Platform.OS === 'web') {
    const openPicker = (e: any) => {
      const input = (e.currentTarget as HTMLElement).querySelector('input');
      if (input && typeof (input as any).showPicker === 'function') {
        try { (input as any).showPicker(); } catch {}
      } else if (input) {
        input.focus();
        input.click();
      }
    };
    return (
      // @ts-ignore
      <div
        onClick={openPicker}
        data-testid={testID}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          minHeight: 50,
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        {/* @ts-ignore */}
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          data-testid={testID ? `${testID}-input` : undefined}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: value ? colors.text : colors.textMuted,
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
            padding: '12px 0',
            cursor: 'pointer',
            width: '100%',
            minWidth: 0,
          }}
        />
      </div>
    );
  }

  // Native: opens DateTimePicker
  const onChangeNative = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) {
      onChange(toISO(selected));
      if (Platform.OS === 'ios') setShow(false);
    } else if (event.type === 'dismissed') {
      setShow(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        testID={testID}
        style={styles.nativeBtn}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.nativeText, !value && { color: colors.textMuted }]}>
          {value ? displayDate(value) : placeholder}
        </Text>
      </TouchableOpacity>

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={value ? fromISO(value) : new Date()}
          mode="date"
          onChange={onChangeNative}
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.modalBtn}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Selecionar data</Text>
                <TouchableOpacity
                  testID="confirm-date-button"
                  onPress={() => {
                    if (!value) onChange(toISO(new Date()));
                    setShow(false);
                  }}
                >
                  <Text style={[styles.modalBtn, { color: colors.primary, fontWeight: '700' }]}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value ? fromISO(value) : new Date()}
                mode="date"
                display="spinner"
                onChange={onChangeNative}
                locale="pt-BR"
                themeVariant="light"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

export function TimePickerField({ value, onChange, placeholder = 'Selecionar horário', testID }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    const openPicker = (e: any) => {
      const input = (e.currentTarget as HTMLElement).querySelector('input');
      if (input && typeof (input as any).showPicker === 'function') {
        try { (input as any).showPicker(); } catch {}
      } else if (input) {
        input.focus();
        input.click();
      }
    };
    return (
      // @ts-ignore
      <div
        onClick={openPicker}
        data-testid={testID}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          paddingLeft: spacing.md,
          paddingRight: spacing.md,
          minHeight: 50,
          gap: 8,
          cursor: 'pointer',
        }}
      >
        <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
        {/* @ts-ignore */}
        <input
          type="time"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          data-testid={testID ? `${testID}-input` : undefined}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: value ? colors.text : colors.textMuted,
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
            padding: '12px 0',
            cursor: 'pointer',
            width: '100%',
            minWidth: 0,
          }}
        />
      </div>
    );
  }

  const buildDate = (hhmm: string): Date => {
    const d = new Date();
    if (hhmm && /^\d{2}:\d{2}$/.test(hhmm)) {
      const [h, m] = hhmm.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d;
  };
  const toHHMM = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const onChangeNative = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) {
      onChange(toHHMM(selected));
      if (Platform.OS === 'ios') setShow(false);
    } else if (event.type === 'dismissed') {
      setShow(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        testID={testID}
        style={styles.nativeBtn}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.nativeText, !value && { color: colors.textMuted }]}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={buildDate(value)}
          mode="time"
          is24Hour
          onChange={onChangeNative}
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.modalBtn}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Selecionar horário</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!value) onChange(toHHMM(new Date()));
                    setShow(false);
                  }}
                >
                  <Text style={[styles.modalBtn, { color: colors.primary, fontWeight: '700' }]}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={buildDate(value)}
                mode="time"
                display="spinner"
                is24Hour
                onChange={onChangeNative}
                themeVariant="light"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  webWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: 8,
  },
  webIcon: {},
  nativeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  nativeText: { fontSize: font.body, color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  modalBtn: { fontSize: font.body, color: colors.textSecondary },
});
