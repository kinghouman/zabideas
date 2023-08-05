import { Popup, Icon } from 'semantic-ui-react';

const StatusIndicatorWithGrafana = ({
  status,
  statusInfo,
  grafanaData,
  title,
  optionalGrafanaData = null,
  optionalTitle = null,
  info,
  grafanaSrc = null,
  grafanaWidth = "800px",
  grafanaHeight = "600px",
}) => {
  const getStatusColor = (status) => statusColors[status] || "grey";

  const gridContent = (
    <Grid columns={4}>
      <Grid.Column width={3}>
        <Icon name="circle" size="large" color={getStatusColor(status)} />
      </Grid.Column>

      <Grid.Column width={4}>
        <DataTablePopup data={grafanaData} title={title} />
        {optionalGrafanaData && optionalTitle && (
          <DataTablePopup data={optionalGrafanaData} title={optionalTitle} />
        )}

        <CustomPopup content={info} trigger={<Icon name="eye" size="large" color="grey" />} />
      </Grid.Column>

      {grafanaSrc && grafanaWidth && grafanaHeight && (
        <Grid.Column width={6}>
          <GrafanaPopup src={grafanaSrc} width={grafanaWidth} height={grafanaHeight} />
        </Grid.Column>
      )}

      <Grid.Column width={3}>
        <StatusInfoPopup statusInfo={statusInfo} />
      </Grid.Column>
    </Grid>
  );

  return (
    <Popup
      content={gridContent}
      on='click'
      position='top center'
      wide
      hoverable
      trigger={<Icon color='grey' name='info' size='large' />}
    />
  );
};
