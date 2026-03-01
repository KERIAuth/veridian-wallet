import {
  ArrowBack,
  CheckCircleOutlined,
  ContentCopy,
  Extension as ExtensionIcon,
  ExpandMore,
  MoreVert,
  PhotoCamera,
  QrCodeRounded,
  RefreshOutlined,
  SmartphoneOutlined,
  WarningAmber,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import axios from "axios";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useSnackbar, VariantType } from "notistack";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useRef, useState } from "react";
import { Trans } from "react-i18next";
import { AppInput } from "../../../../components/AppInput";
import { useKERIAuth } from "../../../../components/AuthContext";
import { PopupModal } from "../../../../components/PopupModal";
import { config } from "../../../../config";
import { i18n } from "../../../../i18n";
import { keriAuthService } from "../../../../services/keriAuthService";
import { resolveOobi } from "../../../../services/resolve-oobi";
import { isValidConnectionUrl } from "../../../../utils/urlChecker";
import "./AddConnectionModal.scss";
import { AddConnectionModalProps } from "./AddConnectionModal.types";

type ModalView = "method" | "qr" | "scan" | "extension-connect";
type ExtStatus = "waiting" | "resolving" | "error";

enum ContentType {
  SCANNER = "scanner",
  RESOLVING = "resolving",
  RESOLVED = "resolved",
}

const viewClassMap: Record<ModalView, string> = {
  method: "stage-method",
  qr: "stage-1",
  scan: "stage-2",
  "extension-connect": "stage-extension",
};

const AddConnectionModal = ({
  openModal,
  setOpenModal,
  handleGetContacts,
}: AddConnectionModalProps) => {
  const [view, setView] = useState<ModalView>("qr");
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorOnRequest, setErrorOnRequest] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isInputValid, setIsInputValid] = useState(false);
  const [touched, setTouched] = useState(false);
  const [oobi, setOobi] = useState("");
  const [restartCamera, setRestartCamera] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(
    ContentType.SCANNER
  );
  const [canReset, setCanReset] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [extStatus, setExtStatus] = useState<ExtStatus>("waiting");
  const [extError, setExtError] = useState("");
  const RESET_TIMEOUT = 1000;
  const { enqueueSnackbar } = useSnackbar();
  const { isExtensionInstalled } = useKERIAuth();

  const triggerToast = (message: string, variant: VariantType) => {
    enqueueSnackbar(message, {
      variant,
      anchorOrigin: { vertical: "top", horizontal: "center" },
    });
  };

  // Pre-fetch the server OOBI as soon as the component mounts
  useEffect(() => {
    handleShowQr();
  }, []);

  // When the modal opens, pick the correct starting view
  useEffect(() => {
    if (!openModal) return;
    setView(isExtensionInstalled ? "method" : "qr");
    setExtStatus("waiting");
    setExtError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModal]);

  // Reset scan-related state whenever entering the scan view
  useEffect(() => {
    if (view === "scan") {
      setCopied(false);
      setShowInput(false);
      setInputValue("");
      setIsInputValid(false);
      setTouched(false);
      handleReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const isCameraRendered = useRef<boolean>(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (elementRef.current && !isCameraRendered.current && showInput) {
      isCameraRendered.current = true;
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { qrbox: { width: 1024, height: 1024 }, fps: 5 },
        false
      );
      scannerRef.current = scanner;

      const success = (result: string) => {
        scanner.clear();
        if (result && result.includes("oobi")) {
          handleResolveOobi(result);
        } else {
          triggerToast(
            i18n.t("pages.connections.addConnection.modal.toast.error"),
            "error"
          );
          restartScanner();
        }
      };
      scanner.render(success, (_: unknown) => {});
    }
  }, [restartCamera, elementRef.current, showInput]);

  const restartScanner = async () => {
    isCameraRendered.current = false;
    setShowInput(false);
    setRestartCamera((r) => !r);
    setContentType(ContentType.SCANNER);
  };

  const handleResolveOobi = async (oobiUrl: string) => {
    if (!oobiUrl || !oobiUrl.includes("oobi")) {
      triggerToast(
        i18n.t("pages.connections.addConnection.modal.toast.error"),
        "error"
      );
      return restartScanner();
    }

    setContentType(ContentType.RESOLVING);
    try {
      const fixed =
        process.env.NODE_ENV === "development"
          ? oobiUrl.replace("http://keria:", "http://localhost:")
          : oobiUrl;

      await resolveOobi(fixed);
      setContentType(ContentType.RESOLVED);
      setCanReset(true);
      triggerToast(
        i18n.t("pages.connections.addConnection.modal.toast.success"),
        "success"
      );
      await handleGetContacts();
      resetModal();
    } catch (error) {
      console.error("Error resolving OOBI:", error);
      triggerToast(
        i18n.t("pages.connections.addConnection.modal.toast.error"),
        "error"
      );
      setContentType(ContentType.SCANNER);
    }
  };

  const renderScanContent = () => {
    switch (contentType) {
      case ContentType.SCANNER:
        return <div ref={elementRef} id="qr-reader" />;
      default:
        return <></>;
    }
  };

  const handleReset = () => {
    setCanReset(false);
    restartScanner();
  };

  const handleShowQr = async () => {
    setShowQR(false);
    setLoading(true);
    setErrorOnRequest(false);
    setOobi("");
    try {
      const response = await axios(`${config.endpoint}${config.path.keriOobi}`);
      setOobi(response.data.data);
      setShowQR(true);
    } catch (e) {
      console.error(e);
      setErrorOnRequest(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (oobi) {
      setCopied(true);
      navigator.clipboard.writeText(oobi);
    }
  };

  const handleExtensionConnect = async () => {
    if (!oobi) return;
    setView("extension-connect");
    setExtStatus("waiting");
    setExtError("");

    try {
      const extensionOobi = await keriAuthService.connectWithExtension(oobi);
      setExtStatus("resolving");

      const fixed =
        process.env.NODE_ENV === "development"
          ? extensionOobi.replace("http://keria:", "http://localhost:")
          : extensionOobi;

      await resolveOobi(fixed);
      await keriAuthService.confirmExtensionConnection(oobi);

      triggerToast(
        i18n.t("pages.connections.addConnection.modal.toast.success"),
        "success"
      );
      await handleGetContacts();
      resetModal();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : i18n.t("pages.connections.addConnection.modal.toast.error");
      setExtStatus("error");
      setExtError(message);
      triggerToast(
        i18n.t("pages.connections.addConnection.modal.toast.error"),
        "error"
      );
    }
  };

  const resetModal = () => {
    setOpenModal(false);
    if (scannerRef.current) {
      scannerRef.current.clear().catch((err) => {
        console.error("Failed to clear html5QrcodeScanner.", err);
      });
    }
    setTimeout(() => {
      setView("qr");
      setErrorOnRequest(false);
      setCopied(false);
      setShowInput(false);
      setExtStatus("waiting");
      setExtError("");
      setCanReset(false);
    }, RESET_TIMEOUT);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    setTouched(true);
    setIsInputValid(isValidConnectionUrl(value));
  };

  const goBack = () => {
    if (view === "scan") {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
      setView(isExtensionInstalled ? "method" : "qr");
    } else if (view === "qr" && isExtensionInstalled) {
      setView("method");
    } else if (view === "extension-connect") {
      setView(isExtensionInstalled ? "method" : "qr");
    }
  };

  const t = (key: string) => i18n.t(key);
  const base = "pages.connections.addConnection.modal";

  return (
    <PopupModal
      open={openModal}
      onClose={resetModal}
      title={t(`${base}.title`)}
      customClass={`add-connection-modal ${viewClassMap[view]}`}
      description={
        view === "method" ? (
          <>{t(`${base}.method.description`)}</>
        ) : view === "qr" ? (
          <Trans
            i18nKey={`${base}.descriptionStepOne`}
            components={{ bold: <strong /> }}
          />
        ) : view === "scan" ? (
          <Trans
            i18nKey={`${base}.descriptionStepTwo`}
            components={{ bold: <strong /> }}
          />
        ) : undefined
      }
      footer={
        <>
          {/* Method picker — no footer buttons, cards are the CTA */}

          {/* QR view footer */}
          {view === "qr" && (
            <>
              {isExtensionInstalled && (
                <Button
                  variant="contained"
                  className="neutral-button back-button"
                  onClick={goBack}
                >
                  <ArrowBack />
                  {t(`${base}.button.back`)}
                </Button>
              )}
              {errorOnRequest ? (
                <Button
                  variant="contained"
                  className="secondary-button"
                  onClick={handleShowQr}
                >
                  {t(`${base}.button.retry`)}
                  <RefreshOutlined />
                </Button>
              ) : (
                <Button
                  variant="contained"
                  className="secondary-button"
                  disabled={!oobi || copied}
                  onClick={handleCopyLink}
                >
                  {t(
                    copied
                      ? `${base}.button.copied`
                      : `${base}.button.copyConnectionId`
                  )}
                  {copied ? <CheckCircleOutlined /> : <ContentCopy />}
                </Button>
              )}
              <Button
                variant="contained"
                className="primary-button"
                disabled={!oobi || errorOnRequest}
                onClick={() => setView("scan")}
              >
                {t(`${base}.button.next`)}
              </Button>
            </>
          )}

          {/* Scan view footer */}
          {view === "scan" && (
            <>
              <Button
                variant="contained"
                className="neutral-button back-button"
                onClick={goBack}
              >
                <ArrowBack />
                {t(`${base}.button.back`)}
              </Button>
              <Button
                variant="contained"
                className="primary-button"
                onClick={() => handleResolveOobi(inputValue || oobi)}
                disabled={!(isInputValid && oobi && oobi.includes("oobi"))}
              >
                {t(`${base}.button.complete`)}
              </Button>
            </>
          )}

          {/* Extension connect footer */}
          {view === "extension-connect" && (
            <>
              {extStatus === "error" && (
                <Button
                  variant="contained"
                  className="secondary-button"
                  onClick={handleExtensionConnect}
                >
                  {t(`${base}.extension.tryAgain`)}
                </Button>
              )}
              <Button
                variant="contained"
                className={extStatus === "error" ? "neutral-button" : "secondary-button"}
                onClick={goBack}
                disabled={extStatus === "resolving"}
              >
                {extStatus === "error" ? (
                  <>
                    <ArrowBack />
                    {t(`${base}.button.back`)}
                  </>
                ) : (
                  t(`${base}.extension.cancel`)
                )}
              </Button>
            </>
          )}
        </>
      }
    >
      {/* ── METHOD PICKER ── */}
      {view === "method" && (
        <div className="method-picker">
          <Box
            className="method-card method-card-extension"
            role="button"
            tabIndex={0}
            onClick={handleExtensionConnect}
            onKeyDown={(e) => e.key === "Enter" && handleExtensionConnect()}
            aria-disabled={!oobi || loading}
          >
            <Box className="method-card-icon method-card-icon-extension">
              <ExtensionIcon />
            </Box>
            <Typography className="method-card-title">
              {t(`${base}.method.extension.title`)}
            </Typography>
            <Typography className="method-card-description">
              {t(`${base}.method.extension.description`)}
            </Typography>
            {loading && (
              <CircularProgress
                size={14}
                className="method-card-loading"
              />
            )}
          </Box>

          <Box
            className="method-card method-card-manual"
            role="button"
            tabIndex={0}
            onClick={() => setView("qr")}
            onKeyDown={(e) => e.key === "Enter" && setView("qr")}
          >
            <Box className="method-card-icon method-card-icon-manual">
              <SmartphoneOutlined />
            </Box>
            <Typography className="method-card-title">
              {t(`${base}.method.manual.title`)}
            </Typography>
            <Typography className="method-card-description">
              {t(`${base}.method.manual.description`)}
            </Typography>
          </Box>
        </div>
      )}

      {/* ── QR CODE VIEW ── */}
      {view === "qr" && (
        <div className="connection-qr">
          {loading && (
            <div className="connection-loading">
              <QrCodeRounded className="qr-code-icon" />
              <CircularProgress className="loading-spinner" />
            </div>
          )}
          {showQR && (
            <QRCodeSVG
              value={oobi}
              size={240}
            />
          )}
          {errorOnRequest && (
            <div className="error-on-request">
              <WarningAmber />
              <Typography>{t(`${base}.errorOnRequest`)}</Typography>
            </div>
          )}
        </div>
      )}

      {/* ── SCAN / PASTE VIEW ── */}
      {view === "scan" && (
        <>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography component="span" className="accordion-collapsed">
                {t(`${base}.learnMore`)}
              </Typography>
              <Typography component="span" className="accordion-expanded">
                {t(`${base}.showLess`)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                <Trans
                  i18nKey={`${base}.descriptionLearnMore`}
                  components={{ moreVertIcon: <MoreVert /> }}
                />
              </Typography>
            </AccordionDetails>
          </Accordion>
          {!canReset && (
            <>
              {showInput ? (
                renderScanContent()
              ) : (
                <Box className="camera-button-container">
                  <Button
                    className="camera-button"
                    onClick={() => setShowInput(true)}
                  >
                    <PhotoCamera />
                  </Button>
                  <Typography onClick={() => setShowInput(true)}>
                    {t(`${base}.button.openCamera`)}
                  </Typography>
                </Box>
              )}
              <AppInput
                label={t(`${base}.pasteUrl`)}
                id="connection-url-input"
                value={inputValue}
                onChange={handleInputChange}
                error={!isInputValid && touched}
                className="connection-url-form"
                errorMessage={t(`${base}.button.errorMessage`)}
              />
            </>
          )}
        </>
      )}

      {/* ── EXTENSION CONNECT VIEW ── */}
      {view === "extension-connect" && (
        <div className="extension-flow">
          <Box className="extension-flow-icon-wrapper">
            <ExtensionIcon className="extension-flow-icon" />
          </Box>

          {extStatus === "waiting" && (
            <>
              <Typography className="extension-flow-title">
                {t(`${base}.extension.waitingTitle`)}
              </Typography>
              <Box className="extension-flow-progress">
                <CircularProgress size={36} />
              </Box>
              <Typography className="extension-flow-hint">
                {t(`${base}.extension.waitingHint`)}
              </Typography>
            </>
          )}

          {extStatus === "resolving" && (
            <>
              <Typography className="extension-flow-title">
                {t(`${base}.extension.resolvingTitle`)}
              </Typography>
              <Box className="extension-flow-progress">
                <CircularProgress size={36} />
              </Box>
            </>
          )}

          {extStatus === "error" && (
            <>
              <Typography className="extension-flow-title extension-flow-title-error">
                {t(`${base}.extension.errorTitle`)}
              </Typography>
              <WarningAmber className="extension-flow-warning" />
              <Typography className="extension-flow-error-message">
                {extError ||
                  t(`${base}.toast.error`)}
              </Typography>
            </>
          )}
        </div>
      )}
    </PopupModal>
  );
};

export { AddConnectionModal };
